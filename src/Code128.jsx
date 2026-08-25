const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
]

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function toCode128BValue(character) {
  const code = character.charCodeAt(0)
  if (code < 32 || code > 126) {
    throw new Error('Code 128 label hanya mendukung karakter ASCII 32-126.')
  }
  return code - 32
}

export function encodeCode128B(value) {
  const text = String(value || '')
  if (!text) throw new Error('Barcode tidak boleh kosong.')

  const values = [104]
  for (const character of text) values.push(toCode128BValue(character))

  let checksum = values[0]
  for (let index = 1; index < values.length; index += 1) checksum += values[index] * index

  values.push(checksum % 103)
  values.push(106)
  return values
}

export function buildCode128Layout(value, quietZone = 10) {
  const encoded = encodeCode128B(value)
  const bars = []
  let x = quietZone

  for (const code of encoded) {
    const pattern = CODE128_PATTERNS[code]
    let drawBar = true

    for (const digit of pattern) {
      const width = Number(digit)
      if (drawBar) bars.push({ x, width })
      x += width
      drawBar = !drawBar
    }
  }

  return { totalWidth: x + quietZone, bars }
}

export function buildCode128SvgMarkup(value, options = {}) {
  const { height = 58, includeText = true, fontSize = 10 } = options
  const layout = buildCode128Layout(value)
  const totalHeight = includeText ? height + 14 : height
  const safeValue = escapeXml(value)
  const bars = layout.bars
    .map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="${height}" fill="#000"/>`)
    .join('')
  const text = includeText
    ? `<text x="${layout.totalWidth / 2}" y="${totalHeight - 2}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="${fontSize}" text-anchor="middle" fill="#111827">${safeValue}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.totalWidth} ${totalHeight}" preserveAspectRatio="none"><rect width="100%" height="100%" fill="#fff"/>${bars}${text}</svg>`
}

export function Code128Svg({ value, className = '', height = 58, includeText = true }) {
  try {
    const layout = buildCode128Layout(value)
    const totalHeight = includeText ? height + 14 : height

    return (
      <svg viewBox={`0 0 ${layout.totalWidth} ${totalHeight}`} className={className} role="img" aria-label={`Barcode ${value}`} preserveAspectRatio="none">
        <rect width="100%" height="100%" fill="#ffffff" />
        {layout.bars.map((bar, index) => (
          <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height={height} fill="#000000" />
        ))}
        {includeText && (
          <text x={layout.totalWidth / 2} y={totalHeight - 2} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="10" textAnchor="middle" fill="#111827">
            {value}
          </text>
        )}
      </svg>
    )
  } catch {
    return <div className={`rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 ${className}`}>Barcode tidak valid</div>
  }
}
