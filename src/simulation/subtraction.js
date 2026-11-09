// Hitung kembalian untuk alat bantu belajar. Tidak mengirim transaksi atau jawaban game.
export const MAX_CALCULATOR_AMOUNT = 1_000_000_000

function parseAmount(raw) {
  const value = String(raw ?? '')
  if (!/^\d{1,10}$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number <= MAX_CALCULATOR_AMOUNT ? number : null
}

export function calculateChange(paidInput, totalInput) {
  const paid = parseAmount(paidInput)
  const total = parseAmount(totalInput)
  if (paid === null || total === null) {
    return { ok:false, error:'Masukkan nominal rupiah dengan angka bulat yang valid.' }
  }
  if (paid < total) {
    return { ok:true, paid, total, insufficient:true, shortage:total-paid, change:0 }
  }
  return { ok:true, paid, total, insufficient:false, shortage:0, change:paid-total }
}
