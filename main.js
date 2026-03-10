import './style.css'
import katex from 'katex'

// Render all KaTeX elements
document.querySelectorAll('[data-katex]').forEach(el => {
  katex.render(el.getAttribute('data-katex'), el, {
    throwOnError: false,
    displayMode: el.hasAttribute('data-display'),
  })
})

// Unified scroll reveal observer
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active')
        revealObserver.unobserve(entry.target)
      }
    })
  },
  { threshold: window.innerWidth < 768 ? 0.05 : 0.1 }
)

// On mobile, halve any inline transition-delay values for snappier feel
if (window.innerWidth < 768) {
  document.querySelectorAll('[style*="transition-delay"]').forEach(el => {
    const match = el.style.transitionDelay.match(/([\d.]+)ms/)
    if (match) {
      el.style.transitionDelay = `${Math.round(parseFloat(match[1]) * 0.5)}ms`
    }
  })
}

document.querySelectorAll('[class*="reveal"]').forEach(el => {
  // Don't observe containers that just hold staggered children
  if (!el.classList.contains('reveal-stagger') && !el.classList.contains('stagger-bullets')) {
    revealObserver.observe(el)
  }
})

// Streak counter animation
const counterEl = document.querySelector('[data-count-to]')
if (counterEl) {
  const target = parseInt(counterEl.getAttribute('data-count-to'), 10)
  let started = false

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !started) {
          started = true
          animateCounter(counterEl, target)
          counterObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 }
  )

  counterObserver.observe(counterEl)
}

function animateCounter(el, target) {
  const duration = window.innerWidth < 768 ? 1000 : 2000
  const start = performance.now()

  function step(now) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    el.textContent = Math.round(eased * target)
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle')
const mobileMenu = document.getElementById('mobile-menu')

if (navToggle && mobileMenu) {
  navToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('open')
    const isOpen = mobileMenu.classList.contains('open')
    navToggle.setAttribute('aria-expanded', isOpen)
  })

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open')
      navToggle.setAttribute('aria-expanded', 'false')
    })
  })
}

// Pricing toggle
const toggle = document.getElementById('pricing-toggle')
const monthlyEls = document.querySelectorAll('[data-price="monthly"]')
const yearlyEls = document.querySelectorAll('[data-price="yearly"]')

if (toggle) {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active')
    const isYearly = toggle.classList.contains('active')
    monthlyEls.forEach(el => el.classList.toggle('hidden', isYearly))
    yearlyEls.forEach(el => el.classList.toggle('hidden', !isYearly))
  })
}
