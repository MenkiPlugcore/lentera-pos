// Pseudonymous public game cookie. No admin access; only owns guest-created sessions.
const GUEST_COOKIE = '__Host-lentera_guest'
const GUEST_SECONDS = 30*24*60*60
const tokenRE = new RegExp('(?:^|;\\s*)'+GUEST_COOKIE+'=([0-9a-f]{64})(?:;|$)','i')

function randomHex() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('')
}
async function sha256(token) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')
}
export function guestCookie(token) {
  return GUEST_COOKIE+'='+token+'; Path=/; Max-Age='+GUEST_SECONDS+'; HttpOnly; Secure; SameSite=Lax'
}
export async function getGuest(db,request,create=false) {
  const token=(request.headers.get('cookie')||'').match(tokenRE)?.[1]
  if(token) {
    const [row]=await db.query(
      "SELECT id FROM public.lentera_game_guest_devices WHERE token_hash=$1 AND expires_at>now() LIMIT 1",
      [await sha256(token)])
    if(row)return {id:row.id,setCookie:null}
  }
  if(!create)return null
  const newToken=randomHex()
  const [row]=await db.query(
    "INSERT INTO public.lentera_game_guest_devices(token_hash,expires_at) VALUES($1,now()+interval '30 days') RETURNING id",
    [await sha256(newToken)])
  return {id:row.id,setCookie:guestCookie(newToken)}
}
