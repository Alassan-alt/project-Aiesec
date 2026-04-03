import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ text, size = 180 }: { text: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const options = useMemo(
    () => ({
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M' as const,
    }),
    [size],
  )

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(text, options)
      .then((url: string) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [text, options])

  if (!dataUrl) {
    return (
      <div
        className="grid place-items-center rounded-xl bg-white/10 text-xs text-white/70"
        style={{ width: size, height: size }}
      >
        Génération…
      </div>
    )
  }

  return <img src={dataUrl} width={size} height={size} alt="QR code" />
}
