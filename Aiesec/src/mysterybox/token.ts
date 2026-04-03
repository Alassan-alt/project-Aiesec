const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

export function generateToken(length = 16): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export function isLikelyToken(value: string | undefined): value is string {
  if (!value) return false
  const token = value.trim().toUpperCase()
  return /^[A-HJ-NP-Z2-9]{8,64}$/.test(token)
}
