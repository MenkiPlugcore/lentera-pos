import { IS_CLOUD, cloudApiFetch } from './cloudApi.js'

// LENTERA POS - penyimpanan lokal tanpa database, backend, atau akun.
// Seluruh data terikat pada origin + profil browser perangkat ini.
const STORAGE_KEY = 'lentera-pos:local:v1';
const VERSION = 1;
const BARCODE_TYPES = new Set(['CODE128', 'EAN13', 'UPC', 'OTHER']);
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
});

function newState() {
  return { version: VERSION, nextSku: 1, nextInvoice: 1, categories: [], products: [], transactions: [] };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkStructure(state) {
  if (!isObject(state) || state.version !== VERSION ||
      !Array.isArray(state.categories) || !Array.isArray(state.products) ||
      !Array.isArray(state.transactions) ||
      !Number.isSafeInteger(state.nextSku) || state.nextSku < 1 ||
      !Number.isSafeInteger(state.nextInvoice) || state.nextInvoice < 1) {
    throw new Error('Format data LENTERA POS tidak valid atau versi tidak didukung.');
  }
}

function readState() {
  let stored;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error('Penyimpanan browser tidak tersedia. Aktifkan penyimpanan situs dan jangan gunakan mode privat.');
  }
  if (stored === null) return newState();
  try {
    const state = JSON.parse(stored);
    checkStructure(state);
    return state;
  } catch {
    throw new Error('Data lokal tidak bisa dibaca. Jangan hapus data browser; pulihkan dari cadangan JSON jika ada.');
  }
}

function writeState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error('Gagal menyimpan data. Kapasitas penyimpanan browser mungkin penuh. Buat cadangan dan kurangi gambar.');
  }
}

// Web Locks mencegah dua tab yang mendukung API ini menimpa stok bersamaan.
// Pada browser tanpa Web Locks, gunakan hanya satu tab POS per perangkat.
async function changeState(handler) {
  const update = () => {
    const state = readState();
    const result = handler(state);
    writeState(state);
    window.dispatchEvent(new Event('lentera-pos:changed'));
    return result;
  };
  if (navigator.locks && typeof navigator.locks.request === 'function') {
    return navigator.locks.request('lentera-pos:local:write', update);
  }
  return update();
}

function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function invalid(message) { throw new Error(message); }

function money(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER) {
    invalid(name + ' harus berupa angka positif yang valid.');
  }
  return number;
}

function stockNumber(value, name) {
  const number = money(value, name);
  if (!Number.isSafeInteger(number)) invalid(name + ' harus berupa bilangan bulat.');
  return number;
}

function jakartaDate(iso) {
  const parts = dateFormatter.formatToParts(new Date(iso));
  const get = (type) => parts.find((item) => item.type === type)?.value || '';
  return get('year') + '-' + get('month') + '-' + get('day');
}

function normalizedProduct(state, product) {
  const category = state.categories.find((item) => item.id === product.category_id);
  return { ...product, category_name: category?.name || null };
}

function validateCategory(state, categoryId) {
  if (!categoryId) return null;
  if (!state.categories.some((item) => item.id === categoryId)) {
    invalid('Kategori produk tidak ditemukan.');
  }
  return categoryId;
}

function validateBarcode(state, barcode, excludeId) {
  if (state.products.some((product) =>
    product.id !== excludeId && String(product.barcode).toLowerCase() === barcode.toLowerCase())) {
    invalid('Barcode atau kode produk sudah digunakan produk lain.');
  }
}

function productFields(state, body, sku, excludeId = null) {
  const name = String(body.name || '').trim();
  if (name.length < 2 || name.length > 120) invalid('Nama produk harus 2–120 karakter.');
  const purchase_price = money(body.purchasePrice, 'Harga beli');
  const selling_price = money(body.sellingPrice, 'Harga jual');
  const stock = stockNumber(body.stock, 'Stok');
  const minimum_stock = stockNumber(body.minimumStock, 'Stok minimum');
  const external = String(body.barcode || '').trim();
  const barcode = external || sku;
  validateBarcode(state, barcode, excludeId);
  const image_url = String(body.imageUrl || '').trim() || null;
  if (image_url && !/^data:image\/(jpeg|png|webp);base64,/i.test(image_url)) {
    invalid('Gunakan gambar lokal dari pilihan unggah, bukan URL eksternal.');
  }
  return {
    name,
    category_id: validateCategory(state, body.categoryId),
    purchase_price, selling_price, stock, minimum_stock,
    barcode, barcode_type: external && BARCODE_TYPES.has(body.barcodeType) ? body.barcodeType : 'CODE128',
    barcode_generated: !external,
    image_url, description: String(body.description || '').trim().slice(0, 2000) || null,
  };
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validatePeriod(params) {
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  if (!validDate(from) || !validDate(to) || from > to ||
      (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000 > 366) {
    invalid('Rentang tanggal tidak valid atau lebih dari 366 hari.');
  }
  return { from, to };
}

function periodTransactions(state, from, to) {
  return state.transactions.filter((item) => {
    const date = jakartaDate(item.completedAt || item.createdAt);
    return date >= from && date <= to;
  });
}

function salesReport(state, from, to) {
  const txs = periodTransactions(state, from, to).filter((item) => item.status === 'completed');
  const revenue = txs.reduce((sum, item) => sum + item.totalAmount, 0);
  const unitsSold = txs.reduce((sum, item) => sum + item.items.reduce((qty, row) => qty + row.quantity, 0), 0);
  const estimatedProfit = txs.reduce((sum, item) =>
    sum + item.items.reduce((profit, row) => profit + (row.unitPrice - row.purchasePrice) * row.quantity, 0), 0);

  const dailyMap = new Map();
  const productMap = new Map();
  for (const tx of txs) {
    const date = jakartaDate(tx.completedAt);
    const day = dailyMap.get(date) || { date, transactionCount: 0, revenue: 0 };
    day.transactionCount += 1;
    day.revenue += tx.totalAmount;
    dailyMap.set(date, day);
    for (const item of tx.items) {
      const key = item.productId || item.sku;
      const record = productMap.get(key) || {
        productId: item.productId, sku: item.sku, name: item.name,
        unitsSold: 0, revenue: 0, estimatedProfit: 0,
      };
      record.unitsSold += item.quantity;
      record.revenue += item.subtotal;
      record.estimatedProfit += (item.unitPrice - item.purchasePrice) * item.quantity;
      productMap.set(key, record);
    }
  }
  return {
    summary: {
      transactionCount: txs.length, revenue,
      averageTicket: txs.length ? revenue / txs.length : 0,
      unitsSold, estimatedProfit,
    },
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    products: [...productMap.values()].sort((a, b) =>
      b.unitsSold - a.unitsSold || b.revenue - a.revenue || a.name.localeCompare(b.name)).slice(0, 20),
    cashiers: txs.length ? [{
      cashierId: 'local', name: 'Kasir Lokal', transactionCount: txs.length, revenue,
    }] : [],
  };
}

// Fungsi ini mempertahankan kontrak respons API lama sehingga panel UI tetap kompatibel,
// tetapi SEMUA pemrosesan terjadi di browser; tidak ada fetch atau permintaan jaringan.
export async function apiFetch(rawUrl, options = {}) {
  if (IS_CLOUD) return cloudApiFetch(rawUrl, options)
  const url = new URL(rawUrl, window.location.origin);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = String(options.method || 'GET').toUpperCase();
  let body = {};
  if (options.body !== undefined) {
    try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; }
    catch { invalid('Data permintaan tidak valid.'); }
    if (!isObject(body)) invalid('Format permintaan harus berupa objek.');
  }

  if (path === '/api/products' && method === 'GET') {
    const state = readState();
    const search = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const products = state.products.map((item) => normalizedProduct(state, item))
      .filter((item) => !search || [item.name, item.sku, item.barcode].some(
        (value) => String(value || '').toLowerCase().includes(search)))
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) ||
        String(b.created_at).localeCompare(String(a.created_at)));
    return { ok: true, products };
  }
  if (path === '/api/categories' && method === 'GET') {
    return { ok: true, categories: readState().categories.slice().sort((a, b) => a.name.localeCompare(b.name)) };
  }
  if (path === '/api/categories' && method === 'POST') {
    return changeState((state) => {
      const name = String(body.name || '').trim();
      if (name.length < 2 || name.length > 60) invalid('Nama kategori harus 2–60 karakter.');
      if (state.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        invalid('Kategori tersebut sudah ada.');
      }
      const category = { id: uuid(), name, description: '', is_active: true };
      state.categories.push(category);
      return { ok: true, category };
    });
  }
  if (path === '/api/products' && method === 'POST') {
    return changeState((state) => {
      const sku = 'LP' + String(state.nextSku).padStart(6, '0');
      const fields = productFields(state, body, sku);
      const now = new Date().toISOString();
      const product = { id: uuid(), sku, ...fields, is_active: true, created_at: now, updated_at: now };
      state.nextSku += 1;
      state.products.push(product);
      return { ok: true, product: normalizedProduct(state, product) };
    });
  }
  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch && (method === 'PATCH' || method === 'DELETE')) {
    return changeState((state) => {
      const product = state.products.find((item) => item.id === decodeURIComponent(productMatch[1]));
      if (!product) invalid('Produk tidak ditemukan.');
      if (method === 'PATCH') {
        const fields = productFields(state, body, product.sku, product.id);
        Object.assign(product, fields, { is_active: body.isActive !== false, updated_at: new Date().toISOString() });
      } else {
        product.is_active = false;
        product.updated_at = new Date().toISOString();
      }
      return { ok: true, product: normalizedProduct(state, product) };
    });
  }
  const hardDelete = path.match(/^\/api\/products\/([^/]+)\/hard-delete$/);
  if (hardDelete && method === 'DELETE') {
    return changeState((state) => {
      const id = decodeURIComponent(hardDelete[1]);
      const product = state.products.find((item) => item.id === id);
      if (!product) invalid('Produk tidak ditemukan.');
      if (state.transactions.some((tx) => tx.items.some((item) => item.productId === id))) {
        invalid('Produk sudah dipakai dalam transaksi. Arsipkan agar riwayat dan laporan tetap konsisten.');
      }
      state.products = state.products.filter((item) => item.id !== id);
      return { ok: true, deleted: { id, sku: product.sku, name: product.name } };
    });
  }
  if (path === '/api/pos/checkout' && method === 'POST') {
    return changeState((state) => {
      const requested = Array.isArray(body.items) ? body.items : [];
      if (!requested.length || requested.length > 100) invalid('Keranjang harus berisi 1–100 jenis produk.');
      const combined = new Map();
      for (const item of requested) {
        const id = String(item?.productId || '');
        const quantity = stockNumber(item?.quantity, 'Jumlah barang');
        if (quantity < 1 || quantity > 999) invalid('Jumlah per produk harus 1–999.');
        const nextQuantity = (combined.get(id) || 0) + quantity;
        if (nextQuantity > 999) invalid('Jumlah salah satu produk melebihi batas transaksi.');
        combined.set(id, nextQuantity);
      }
      const items = [...combined].map(([id, quantity]) => {
        const product = state.products.find((p) => p.id === id && p.is_active);
        if (!product) invalid('Ada produk yang tidak tersedia atau diarsipkan.');
        if (product.stock < quantity) invalid('Stok ' + product.name + ' tidak mencukupi.');
        return {
          id: uuid(), productId: id, sku: product.sku, name: product.name, quantity,
          unitPrice: product.selling_price, purchasePrice: product.purchase_price,
          subtotal: product.selling_price * quantity,
        };
      });
      const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
      const paidAmount = money(body.paidAmount, 'Nominal pembayaran');
      if (paidAmount < totalAmount) invalid('Nominal pembayaran kurang dari total belanja.');
      const now = new Date().toISOString();
      const invoiceNo = 'LP-' + jakartaDate(now).replaceAll('-', '') + '-' + String(state.nextInvoice).padStart(6, '0');
      const transaction = {
        id: uuid(), invoiceNo, status: 'completed', paymentMethod: 'cash',
        cashierId: 'local', cashierName: 'Kasir Lokal',
        subtotal: totalAmount, discountAmount: 0, totalAmount,
        paidAmount, changeAmount: paidAmount - totalAmount,
        notes: String(body.notes || '').trim().slice(0, 500) || null,
        createdAt: now, completedAt: now, cancelledAt: null,
        units: items.reduce((sum, item) => sum + item.quantity, 0), items,
      };
      for (const item of items) {
        const product = state.products.find((p) => p.id === item.productId);
        product.stock -= item.quantity;
        product.updated_at = now;
      }
      state.nextInvoice += 1;
      state.transactions.push(transaction);
      return { ok: true, transaction };
    });
  }
  if (path === '/api/reports/sales' && method === 'GET') {
    const { from, to } = validatePeriod(url.searchParams);
    return { ok: true, from, to, report: salesReport(readState(), from, to) };
  }
  if (path === '/api/transactions' && method === 'GET') {
    const { from, to } = validatePeriod(url.searchParams);
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 120).toLowerCase();
    const transactions = periodTransactions(readState(), from, to)
      .filter((tx) => !query || [tx.invoiceNo, tx.cashierName,
        ...tx.items.flatMap((item) => [item.sku, item.name])]
        .some((text) => String(text || '').toLowerCase().includes(query)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
    return { ok: true, from, to, query, transactions };
  }
  invalid('Fitur lokal tidak ditemukan: ' + method + ' ' + path);
}

export function exportBackup() {
  return JSON.stringify({
    app: 'lentera-pos', version: VERSION, exportedAt: new Date().toISOString(), data: readState(),
  }, null, 2);
}

export function restoreBackup(source) {
  let backup;
  try { backup = JSON.parse(source); }
  catch { invalid('File bukan JSON yang valid.'); }
  if (!isObject(backup) || backup.app !== 'lentera-pos' || backup.version !== VERSION) {
    invalid('File bukan cadangan LENTERA POS versi 1.');
  }
  const state = backup.data;
  checkStructure(state);
  const categoryIds = new Set();
  for (const item of state.categories) {
    if (!isObject(item) || typeof item.id !== 'string' || !item.id ||
        typeof item.name !== 'string' || item.name.length < 2 || categoryIds.has(item.id)) {
      invalid('Data kategori dalam cadangan tidak valid.');
    }
    categoryIds.add(item.id);
  }
  const productIds = new Set();
  const barcodes = new Set();
  for (const item of state.products) {
    if (!isObject(item) || typeof item.id !== 'string' || !item.id ||
        typeof item.sku !== 'string' || !/^LP\d{6,}$/.test(item.sku) ||
        typeof item.name !== 'string' || item.name.length < 2 ||
        !Number.isSafeInteger(item.stock) || item.stock < 0 ||
        !Number.isSafeInteger(item.minimum_stock) || item.minimum_stock < 0 ||
        !Number.isFinite(item.selling_price) || item.selling_price < 0 ||
        !Number.isFinite(item.purchase_price) || item.purchase_price < 0 ||
        (item.category_id && !categoryIds.has(item.category_id)) ||
        typeof item.barcode !== 'string' || !item.barcode ||
        (item.image_url && !/^data:image\/(jpeg|png|webp);base64,/i.test(item.image_url)) ||
        productIds.has(item.id) || barcodes.has(item.barcode.toLowerCase())) {
      invalid('Data produk atau barcode dalam cadangan tidak valid.');
    }
    productIds.add(item.id);
    barcodes.add(item.barcode.toLowerCase());
  }
  const txIds = new Set();
  for (const tx of state.transactions) {
    if (!isObject(tx) || typeof tx.id !== 'string' || !tx.id ||
        typeof tx.invoiceNo !== 'string' || !Array.isArray(tx.items) ||
        !Number.isFinite(tx.totalAmount) || tx.totalAmount < 0 ||
        !Number.isFinite(tx.paidAmount) || tx.paidAmount < tx.totalAmount ||
        !tx.completedAt || Number.isNaN(Date.parse(tx.completedAt)) || txIds.has(tx.id)) {
      invalid('Data transaksi dalam cadangan tidak valid.');
    }
    txIds.add(tx.id);
    for (const item of tx.items) {
      if (!isObject(item) || typeof item.name !== 'string' ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
          !Number.isFinite(item.unitPrice) || !Number.isFinite(item.purchasePrice) ||
          !Number.isFinite(item.subtotal)) {
        invalid('Item transaksi dalam cadangan tidak valid.');
      }
    }
  }
  const maxSku = Math.max(0, ...state.products.map((p) => Number(p.sku.slice(2)) || 0));
  const maxInvoice = Math.max(0, ...state.transactions.map((tx) =>
    Number(tx.invoiceNo.match(/-(\d+)$/)?.[1]) || 0));
  state.nextSku = Math.max(state.nextSku, maxSku + 1);
  state.nextInvoice = Math.max(state.nextInvoice, maxInvoice + 1);
  writeState(state);
  window.dispatchEvent(new Event('lentera-pos:changed'));
  return { products: state.products.length, transactions: state.transactions.length };
}

export function getLocalStats() {
  const state = readState();
  return {
    products: state.products.length, categories: state.categories.length,
    transactions: state.transactions.length,
  };
}

// Gambar diubah menjadi JPEG kecil untuk mengurangi pemakaian kuota localStorage.
export async function imageFileToDataUrl(file) {
  if (!file?.type?.startsWith('image/')) invalid('Pilih file gambar.');
  if (file.size > 5 * 1024 * 1024) invalid('Gambar maksimal 5 MB sebelum dikompresi.');
  const raw = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca gambar.'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => resolve(picture);
    picture.onerror = () => reject(new Error('Format gambar tidak didukung.'));
    picture.src = raw;
  });
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) invalid('Browser tidak mendukung konversi gambar.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL('image/jpeg', 0.66);
  if (compressed.length > 250000) invalid('Gambar masih terlalu besar; gunakan gambar dengan resolusi lebih rendah.');
  return compressed;
}
