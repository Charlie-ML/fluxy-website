import './style.css'

// Vercel rewrites /join/:code to this page — pull the code out of the path.
// Sanitise to the code charset (letters + digits, max 20) and never inject the
// raw path segment into the DOM.
const segments = window.location.pathname.split('/').filter(Boolean)
const raw = segments[0]?.toLowerCase() === 'join' ? (segments[1] ?? '') : ''
const code = decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)

const codeCard = document.getElementById('code-card')
const noCode = document.getElementById('no-code')

// Fluxy codes are at least 4 characters — anything shorter is a malformed link.
if (code.length >= 4) {
  document.getElementById('join-code').textContent = code
  codeCard.classList.remove('hidden')
} else {
  noCode.classList.remove('hidden')
}

const copyBtn = document.getElementById('copy-code')
copyBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(code)
    copyBtn.textContent = 'Copied!'
    setTimeout(() => { copyBtn.textContent = 'Copy code' }, 2000)
  } catch {
    // Clipboard unavailable (e.g. non-secure context) — the code is select-all anyway.
  }
})
