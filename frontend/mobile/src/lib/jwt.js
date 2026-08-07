// Hermes (RN's JS engine) does not provide a global `atob`/`btoa` — unlike the web dashboard
// (frontend/web/src/store/authStore.js), which decodes the JWT payload with
// `JSON.parse(atob(accessToken.split('.')[1]))` directly. This is a dependency-free
// base64url decoder standing in for `atob` so the same {userId,companyId,role,
// subscriptionTier,accountType} payload shape can be read on mobile.
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64Decode(input) {
  let output = ''
  let buffer = 0
  let bits = 0
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '=') break
    const index = BASE64_CHARS.indexOf(c)
    if (index === -1) continue
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      output += String.fromCharCode((buffer >> bits) & 0xff)
    }
  }
  return output
}

/** Decodes a JWT's payload segment into a plain object. Returns {} if malformed. */
export function decodeJwt(token) {
  try {
    const segment = token.split('.')[1]
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const binary = base64Decode(base64)
    // Re-interpret the latin1-ish binary string as UTF-8 (mirrors the classic
    // decodeURIComponent(escape(atob(...))) trick used for atob-based JWT decoding).
    const percentEncoded = binary
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
    return JSON.parse(decodeURIComponent(percentEncoded))
  } catch {
    return {}
  }
}
