import { BrowserMultiFormatReader } from '@zxing/browser'

const FALLBACK_FORMATS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']

class ZXingBarcodeDetector {
  constructor() {
    this.reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 800,
    })
  }

  static async getSupportedFormats() {
    return FALLBACK_FORMATS
  }

  async detect(source) {
    if (!source) return []

    try {
      const result = this.reader.decode(source)
      const rawValue = typeof result?.getText === 'function' ? result.getText() : String(result?.text || '')
      if (!rawValue) return []
      return [{ rawValue, format: 'unknown' }]
    } catch {
      return []
    }
  }
}

if (typeof window !== 'undefined' && !('BarcodeDetector' in window)) {
  window.BarcodeDetector = ZXingBarcodeDetector
}
