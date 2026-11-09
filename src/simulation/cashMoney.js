// Pecahan rupiah latihan (ilustrasi, bukan replika uang resmi).
// Nominal ditampilkan dan dijumlahkan dalam rupiah integer.
export const CASH_DENOMINATIONS = Object.freeze([
  Object.freeze({ value: 100000, type: 'note', color: '#c64748', light: '#f7d6d2' }),
  Object.freeze({ value: 50000, type: 'note', color: '#356dc1', light: '#d4e5ff' }),
  Object.freeze({ value: 20000, type: 'note', color: '#488a67', light: '#d8f2e3' }),
  Object.freeze({ value: 10000, type: 'note', color: '#8357b6', light: '#e9dafa' }),
  Object.freeze({ value: 5000, type: 'note', color: '#a76e3d', light: '#f4e5d7' }),
  Object.freeze({ value: 2000, type: 'note', color: '#75818e', light: '#e5e9ef' }),
  Object.freeze({ value: 1000, type: 'note', color: '#637d62', light: '#e5f0df' }),
  Object.freeze({ value: 500, type: 'coin', color: '#b99a3f', light: '#fcf2c8' }),
  Object.freeze({ value: 200, type: 'coin', color: '#87949e', light: '#e9edf1' }),
  Object.freeze({ value: 100, type: 'coin', color: '#87949e', light: '#e9edf1' }),
])

const VALID = new Set(CASH_DENOMINATIONS.map(item => item.value))
export const MAX_CASH_PIECES = 60

export function totalCash(selected) {
  if (!Array.isArray(selected)) return 0
  return selected.reduce(
    (total, value) => total + (VALID.has(value) ? value : 0),
    0,
  )
}

export function canAddCash(selected, amount, paidAmount) {
  if (!Array.isArray(selected) || !VALID.has(amount) || selected.length >= MAX_CASH_PIECES) return false
  if (!Number.isSafeInteger(paidAmount) || paidAmount < 0) return false
  return totalCash(selected) + amount <= paidAmount
}

export function addCash(selected, amount, paidAmount) {
  return canAddCash(selected, amount, paidAmount) ? [...selected, amount] : selected
}

export function removeLastCash(selected) {
  return Array.isArray(selected) ? selected.slice(0, -1) : []
}

export function removeCashValue(selected, value) {
  if (!Array.isArray(selected) || !VALID.has(value)) return Array.isArray(selected) ? selected : []
  const index = selected.lastIndexOf(value)
  if (index < 0) return selected
  return selected.filter((_, i) => i !== index)
}

export function cashBreakdown(selected) {
  if (!Array.isArray(selected)) return []
  const counts = new Map()
  for (const amount of selected) {
    if (VALID.has(amount)) counts.set(amount, (counts.get(amount) || 0) + 1)
  }
  return CASH_DENOMINATIONS.filter(d => counts.has(d.value))
    .map(d => ({ ...d, count: counts.get(d.value) }))
}

export function canBuildExactChange(change) {
  return Number.isSafeInteger(change) && change >= 0 && change % 100 === 0
}
