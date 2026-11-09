// Data tokoh ilustrasi fiktif. Tidak memakai foto/data pribadi siswa.
// Penentuan tokoh stabil berdasarkan ID soal: refresh tidak mengganti pelanggan.
export const CUSTOMERS = Object.freeze([
  {
    id:'naya',name:'Naya',label:'Pelajar',palette:'violet',
    shirt:'#9b5fb4',hair:'#583829',
    imageUrl:'https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794236652/lentera-pos/customers/pelanggan-ungu-v1.png',
    greeting:'Halo, Kak. Saya mau belanja, ya!'
  },
  {
    id:'raka',name:'Raka',label:'Pelajar',palette:'emerald',
    shirt:'#275f69',hair:'#29282e',
    imageUrl:'https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794236677/lentera-pos/customers/pelanggan-jaket-biru-v1.png',
    greeting:'Permisi, Kak. Saya mau membeli sesuatu.'
  },
  {
    id:'bu-maya',name:'Bu Maya',label:'Pelanggan',palette:'orange',
    shirt:'#199e8a',hair:'#3e302a',
    imageUrl:'https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794236683/lentera-pos/customers/pelanggan-kacamata-v1.png',
    greeting:'Selamat siang. Saya mau belanja, boleh?'
  },
])

export function customerForChallenge(challengeId) {
  const id = String(challengeId || '')
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return CUSTOMERS[(hash >>> 0) % CUSTOMERS.length]
}

export function changeChoices(challenge) {
  if (!challenge) return []
  const paid = Number(challenge.paidAmount)
  const total = Number(challenge.totalAmount)
  if (!Number.isSafeInteger(paid) || !Number.isSafeInteger(total) || paid < total) return []
  const correct = paid - total
  const step = Math.max(500, Math.min(5000, Math.round(Number(challenge.unitPrice || 1000) / 1000) * 1000 || 1000))
  const values = new Set([correct])
  for (const diff of [-step, step, -step * 2, step * 2, step * 3]) {
    if (values.size >= 3) break
    const candidate = correct + diff
    if (candidate >= 0 && Number.isSafeInteger(candidate)) values.add(candidate)
  }
  if (values.size < 3) values.add(correct + step * 4)
  const options = [...values].slice(0, 3)
  let hash = 0
  for (const char of String(challenge.id || '')) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0
  const rotation = (hash >>> 0) % options.length
  return [...options.slice(rotation), ...options.slice(0, rotation)]
}

export function customerDialogue(customer, challenge, feedback) {
  if (!challenge) return customer?.greeting || 'Halo!'
  if (feedback?.correct) return 'Terima kasih! Kembaliannya sudah tepat.'
  if (feedback?.resolved) return 'Tidak apa-apa. Kita latihan lagi, ya.'
  if (feedback && !feedback.correct) return 'Coba periksa kembaliannya sekali lagi, ya.'
  return 'Saya mau ' + challenge.quantity + ' ' + challenge.itemName +
    '. Saya bayar ' + formatRupiah(challenge.paidAmount) + '.'
}

export function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0)
}
