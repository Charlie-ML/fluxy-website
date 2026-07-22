import './style.css'

// Custom Firebase email-action handler (GROWTH_PLAN B19). The Firebase console's
// action URL points all auth-action emails here. We handle mode=verifyEmail
// ourselves so the "link already used" case can say the honest thing: a school
// or work mail scanner almost certainly opened the one-shot link first, which
// APPLIED the verification, so the user is already verified and just needs to
// tap Continue in the app. Every other mode (password reset, email change)
// belongs to Firebase's own hosted handler and is forwarded untouched.
//
// The oobCode and apiKey are used only in the API call, never injected into
// the DOM. The apiKey in the link is the project's public web API key.

const FIREBASE_DEFAULT_HANDLER = 'https://fluxy-6a31a.firebaseapp.com/__/auth/action'

const params = new URLSearchParams(window.location.search)
const mode = params.get('mode')
const oobCode = params.get('oobCode')
const apiKey = params.get('apiKey')

const STATES = ['state-working', 'state-success', 'state-already', 'state-expired', 'state-invalid', 'state-error']
function show(id) {
  for (const s of STATES) document.getElementById(s)?.classList.toggle('hidden', s !== id)
}

if (mode && mode !== 'verifyEmail') {
  // Password reset / email change / etc. — Firebase's handler owns these flows.
  window.location.replace(FIREBASE_DEFAULT_HANDLER + window.location.search)
} else if (!oobCode || !apiKey) {
  show('state-invalid')
} else {
  verify()
}

async function verify() {
  show('state-working')
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oobCode }),
      }
    )
    if (res.ok) {
      show('state-success')
      return
    }
    const data = await res.json().catch(() => ({}))
    const code = String(data?.error?.message ?? '')
    if (code.startsWith('EXPIRED_OOB_CODE')) {
      show('state-expired')
    } else {
      // INVALID_OOB_CODE: the one-shot code was already consumed (typically by
      // a mail scanner that thereby applied the verification) or the link was
      // mangled. "Already verified, tap Continue" is the honest guidance.
      show('state-already')
    }
  } catch {
    show('state-error')
  }
}
