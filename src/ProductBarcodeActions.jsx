import { Code128Svg, buildCode128SvgMarkup } from './Code128.jsx'

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeFilename(value) {
  return String(value || 'produk')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildLabelSvg(product) {
  const barcode = buildCode128SvgMarkup(product.sku, {
    height: 52,
    includeText: true,
    fontSize: 10,
  })
    .replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg x="10" y="45" width="280" height="92"')
    .replace(/<rect width="100%" height="100%" fill="#fff"\/>/, '')

  const name = escapeHtml(product.name)
  const price = escapeHtml(formatRupiah(product.selling_price))
  const sku = escapeHtml(product.sku)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="30mm" viewBox="0 0 300 180">
    <rect width="300" height="180" fill="#fff"/>
    <text x="150" y="20" font-family="Arial,sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="#111827">LENTERA POS</text>
    <text x="150" y="38" font-family="Arial,sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#000">${name}</text>
    ${barcode}
    <text x="150" y="156" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#000">${price}</text>
    <text x="150" y="172" font-family="ui-monospace,monospace" font-size="8" text-anchor="middle" fill="#4b5563">${sku}</text>
  </svg>`
}

export default function ProductBarcodeActions({ product }) {
  function downloadSvg() {
    try {
      const svg = buildLabelSvg(product)
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${product.sku}-${safeFilename(product.name)}-label.svg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      window.alert(error.message || 'Barcode tidak dapat dibuat.')
    }
  }

  function printLabel() {
    try {
      const svg = buildLabelSvg(product)
      const popup = window.open('', '_blank', 'width=520,height=420')
      if (!popup) {
        window.alert('Popup diblokir browser. Izinkan popup untuk mencetak label.')
        return
      }

      popup.document.write(`<!doctype html>
        <html>
          <head>
            <title>Label ${escapeHtml(product.sku)}</title>
            <style>
              @page { size: 50mm 30mm; margin: 0; }
              html, body { margin: 0; padding: 0; width: 50mm; height: 30mm; background: #fff; }
              body { display: grid; place-items: center; overflow: hidden; }
              svg { width: 50mm; height: 30mm; display: block; }
              @media print { html, body { width: 50mm; height: 30mm; } }
            </style>
          </head>
          <body>${svg}<script>window.onload=()=>window.print()<\/script></body>
        </html>`)
      popup.document.close()
    } catch (error) {
      window.alert(error.message || 'Label tidak dapat dicetak.')
    }
  }

  return (
    <div className="mt-3 min-w-[170px]">
      <div className="rounded-xl bg-white p-1.5 shadow-sm">
        <Code128Svg value={product.sku} className="h-12 w-full" height={42} includeText />
      </div>
      <div className="mt-2 flex flex-wrap justify-end gap-1.5">
        <button type="button" className="table-button" onClick={printLabel}>Print Label</button>
        <button type="button" className="table-button" onClick={downloadSvg}>Download SVG</button>
      </div>
    </div>
  )
}
