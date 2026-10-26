/**
 * Ported from astro-theme-pure:
 *   packages/pure/utils/{theme,toast}.ts
 *   packages/pure/components/basic/{Header,ThemeProvider}.astro
 *   packages/pure/components/pages/{TOC,BackToTop,Copyright}.astro
 *   packages/pure/components/user/Collapse.astro
 *   src/layouts/ContentLayout.astro
 *   src/pages/search/index.astro + packages/pure/components/pages/PFSearch.astro
 */

/* ==========================================================================
   Theme
   ========================================================================== */
const THEMES = ['system', 'dark', 'light']

export function getTheme() {
  return localStorage.getItem('theme')
}

export function listenThemeChange(theme) {
  // If theme is specified, no need to listen to the window theme change
  if (theme && theme !== 'system') return
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    setTheme(e.matches ? 'dark' : 'light')
  })
}

export function setTheme(theme, save = false) {
  if (theme) {
    if (!THEMES.includes(theme)) return
    if (save) localStorage.setItem('theme', theme)
  } else {
    theme = getTheme() ?? undefined
    if (save) {
      // Cycle through ['system', 'dark', 'light']
      const currentIndex = THEMES.indexOf(theme ?? 'system')
      theme = THEMES[(currentIndex + 1) % THEMES.length]
      localStorage.setItem('theme', theme)
    }
  }

  let targetTheme = theme
  if (theme === 'system') {
    targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    listenThemeChange(theme)
  }

  document.documentElement.classList.toggle('dark', targetTheme === 'dark')
  // Mermaid (and anything else that bakes colours in) listens for this.
  window.dispatchEvent(new CustomEvent('pure:theme-change', { detail: { theme: targetTheme } }))
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', targetTheme === 'dark' ? '#0B0B10' : '#FCFCFD')

  return theme
}

/* ==========================================================================
   Toast
   ========================================================================== */
export function showToast(detail) {
  document.dispatchEvent(new CustomEvent('toast', { detail }))
}

const INFO_ICON =
  "<svg width='22' height='22' viewBox='0 0 24 24' fill='currentColor'><path fill=\"currentColor\" d=\"M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16m-.01 6c.558 0 1.01.452 1.01 1.01v5.124A1 1 0 0 1 12.5 18h-.49A1.01 1.01 0 0 1 11 16.99V12a1 1 0 1 1 0-2zM12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2\"/></svg>"

document.addEventListener('toast', (e) => {
  const { message, time } = e.detail
  const toast = document.createElement('div')
  toast.className =
    'toast animate px-4 py-2 bg-muted text-foreground rounded-lg border shadow-lg flex items-center gap-2'
  toast.innerHTML = `${INFO_ICON} <span>${message}</span>`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), time || 3000)
})

/* ==========================================================================
   Header
   ========================================================================== */
class HeaderComponent extends HTMLElement {
  connectedCallback() {
    let preScrollY = window.scrollY
    this.classList.toggle('not-top', preScrollY > 20)

    window.addEventListener('scroll', () => {
      this.classList.toggle('not-top', window.scrollY > 20)
      this.dataset.show = (
        window.scrollY < 350 || window.scrollY < preScrollY
      ).toString()
      preScrollY = window.scrollY
    })

    // Dark mode
    const darkModeBtn = this.querySelector('#toggleDarkMode')
    darkModeBtn?.addEventListener('click', () => {
      const newTheme = setTheme(undefined, true)
      darkModeBtn.dataset.theme = newTheme
      showToast({ message: `Set theme to ${newTheme}` })
    })

    // Menu
    this.querySelector('#toggleMenu')?.addEventListener('click', () => {
      this.classList.toggle('expanded')
    })
  }
}
if (!customElements.get('header-component')) {
  customElements.define('header-component', HeaderComponent)
}

/* ==========================================================================
   Table of contents
   ========================================================================== */
/** `getAttribute('href')` may be percent-encoded (e.g. CJK anchors), while the
 *  heading `id` is not — decode so the two can be compared. */
function decodeSlug(slug) {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

class TOC extends HTMLElement {
  headings = []
  tocLinks = []
  headingProgress = {}

  constructor() {
    super()
    this.headings = Array.from(
      document.querySelectorAll(
        'article h1, article h2, article h3, article h4, article h5, article h6'
      )
    )
    this.tocLinks = Array.from(this.querySelectorAll('a[href^="#"]')).map((link) => ({
      element: link,
      progressBar: link.previousElementSibling,
      slug: decodeSlug((link.getAttribute('href') || '').substring(1))
    }))
  }

  updatePositionAndStyle = () => {
    const windowHeight = window.innerHeight
    const content = document.querySelector('#content')
    const pageOffset = window.scrollY - (content?.offsetTop || 0)
    const postOffset = (content?.offsetHeight || 0) + 127

    this.headings.forEach((el, index) => {
      const nextHeadingTop = this.headings[index + 1]?.offsetTop || postOffset
      const range = [el.offsetTop - pageOffset, nextHeadingTop - pageOffset - el.offsetHeight]
      const progress = (windowHeight - range[0]) / (range[1] - range[0])

      this.headingProgress[el.id] = {
        inView: range[0] < windowHeight && range[1] > 0,
        progress: Math.max(0, Math.min(1, progress))
      }
    })

    /* 长目录（加密文章可达几十条）在侧栏里滚动时，活动条目会落到可视区外，
       看起来就像高亮消失了。活动条目一变，就把侧栏滚到它附近；只在变化的
       那一刻滚动，避免每 100ms 与用户的手动滚动打架。 */
    let activeSlug = null

    this.tocLinks.forEach(({ element: el, progressBar: bar, slug }, i) => {
      const state = this.headingProgress[slug]
      if (!state) return
      const { inView, progress } = state
      if (inView && !activeSlug) activeSlug = slug
      el.classList.toggle('highlight', inView)
      el.classList.toggle('highlight-bg-translucent', inView)
      el.classList.toggle(
        'rounded-t-2xl',
        inView && (i === 0 || !this.headingProgress[this.tocLinks[i - 1]?.slug]?.inView)
      )
      el.classList.toggle(
        'rounded-b-2xl',
        inView &&
          (i === this.tocLinks.length - 1 ||
            !this.headingProgress[this.tocLinks[i + 1]?.slug]?.inView)
      )
      if (bar) {
        bar.classList.toggle('is-read', !inView && progress === 1)
        bar.classList.toggle('highlight-bg', inView)
        bar.style.setProperty('height', `${progress * 90}%`)
      }
    })

    if (activeSlug && activeSlug !== this.activeSlug) {
      this.activeSlug = activeSlug
      const sidebar = document.getElementById('sidebar')
      const activeLink = this.tocLinks.find((link) => link.slug === activeSlug)?.element
      if (sidebar && activeLink) {
        const box = sidebar.getBoundingClientRect()
        const rect = activeLink.getBoundingClientRect()
        if (rect.top < box.top || rect.bottom > box.bottom) {
          const offset = rect.top - box.top + sidebar.scrollTop
          sidebar.scrollTo({
            top: offset - (sidebar.clientHeight - activeLink.offsetHeight) / 2,
            behavior: 'smooth'
          })
        }
      }
    }
  }

  connectedCallback() {
    // Smooth scroll
    this.tocLinks.forEach((link) => {
      link.element.addEventListener('click', (e) => {
        e.preventDefault()
        const directHeading = this.headings.find((heading) => heading.id === link.slug)
        if (directHeading) {
          history.pushState(null, directHeading.textContent || '', link.element.getAttribute('href'))
          directHeading.scrollIntoView({ behavior: 'smooth' })
        } else {
          console.warn(`No heading found for slug: ${link.slug}`)
        }
      })
    })

    setInterval(this.updatePositionAndStyle, 100)
    window.addEventListener('scroll', this.updatePositionAndStyle)
  }
}
if (!customElements.get('toc-heading')) {
  customElements.define('toc-heading', TOC)
}

/* ==========================================================================
   Back to top + reading progress
   ========================================================================== */
class ScrollBtn extends HTMLElement {
  ticking = false
  needPercent = true

  calculateScrollPercent() {
    const scrollTop = Math.max(0, window.scrollY || document.documentElement.scrollTop)
    if (scrollTop < this.articleTop) return 0
    const maxScrollable = this.maxScrollHeight - this.viewportHeight
    if (maxScrollable <= 0) return 100
    const progress = Math.min(scrollTop - this.articleTop, maxScrollable)
    return Math.round((progress / maxScrollable) * 100)
  }

  updateScrollPercent() {
    const percent = this.calculateScrollPercent()
    this.scrollPercentEl.textContent = percent.toString()
    this.actionBtns.classList.toggle('ended', percent >= 100)
    this.ticking = false
  }

  connectedCallback() {
    this.needPercent = this.dataset.percent !== 'false'
    this.actionBtns = document.getElementById('action-buttons')
    this.scrollBtn = this.querySelector('button#to-top-btn')
    this.scrollPercentEl = this.scrollBtn?.querySelector('.top-text .text')
    this.targetHeader = document.getElementById(this.dataset.header)
    this.articleEl = document.getElementById(this.dataset.content)

    if (!this.articleEl) {
      console.error(`Element with ID ${this.dataset.content} not found.`)
      this.needPercent = false
    }

    this.scrollBtn?.addEventListener('click', this)

    if (this.targetHeader) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this.actionBtns?.classList.toggle('show', !entry.isIntersecting)
        })
      })
      observer.observe(this.targetHeader)
    }

    if (this.needPercent) {
      this.maxScrollHeight = this.articleEl.scrollHeight
      this.articleTop = this.articleEl.offsetTop
      this.viewportHeight = document.documentElement.clientHeight

      document.addEventListener('scroll', () => {
        if (!this.ticking) {
          requestAnimationFrame(() => this.updateScrollPercent())
          this.ticking = true
        }
      })
    } else {
      this.actionBtns?.classList.add('ended')
    }
  }

  handleEvent(event) {
    if (event.type === 'click') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
if (!customElements.get('scroll-button')) {
  customElements.define('scroll-button', ScrollBtn)
}

/* ==========================================================================
   Sidebar (ContentLayout)
   ========================================================================== */
const sidebarButton = document.getElementById('sidebar-btn')
const sidebar = document.getElementById('sidebar')
const sidebarShade = document.getElementById('sidebar-shade')

function toggleSidebar() {
  if (!sidebar) return
  if (sidebar.classList.contains('show')) {
    sidebar.classList.remove('show')
    if (sidebarShade) sidebarShade.style.display = 'none'
  } else {
    sidebar.classList.add('show')
    if (sidebarShade) sidebarShade.style.display = 'block'
  }
}

if (sidebarShade) sidebarShade.addEventListener('click', toggleSidebar)
sidebarButton?.addEventListener('click', toggleSidebar)

/* ==========================================================================
   Collapse
   ========================================================================== */
class Collapse extends HTMLElement {
  connectedCallback() {
    this.querySelector('.expand-title')?.addEventListener('click', () => {
      this.classList.toggle('expanded')
    })
  }
}
if (!customElements.get('collapse-component')) {
  customElements.define('collapse-component', Collapse)
}

/* ==========================================================================
   Copyright card — copy link + QR code
   ========================================================================== */
document.getElementById('copy-link')?.addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href)
  showToast({ message: 'Link copied!' })
})

document.getElementById('get-qrcode')?.addEventListener('click', () => {
  document.getElementById('qrcode-container')?.classList.toggle('expanded')
})

/* ==========================================================================
   QR code (copyright card)
   ========================================================================== */
;(function () {
  const container = document.getElementById('qrcode-container')
  if (!container || container.innerHTML !== '') return
  const init = () => {
    if (typeof window.QRCode !== 'function') return
    new window.QRCode(container, window.location.href)
  }
  if (typeof window.QRCode === 'function') init()
  else window.addEventListener('load', init)
})()

/* ==========================================================================
   Code blocks — copy + collapse
   ========================================================================== */
export function initCodeBlocks(root = document) {
  root.querySelectorAll('.code-block button.copy').forEach((button) => {
    if (button.dataset.pureBound) return
    button.dataset.pureBound = '1'
    button.addEventListener('click', () => {
      const code = button.closest('.code-block')?.querySelector('pre code')
      if (!code) return
      // Line numbers live in `.ln` spans and must not be copied
      const clone = code.cloneNode(true)
      clone.querySelectorAll('.ln').forEach((n) => n.remove())
      navigator.clipboard.writeText(clone.textContent ?? '')
      button.classList.add('copied')
      setTimeout(() => button.classList.remove('copied'), 2000)
    })
  })

  root.querySelectorAll('.code-block .collapse-toggle').forEach((button) => {
    if (button.dataset.pureBound) return
    button.dataset.pureBound = '1'
    button.addEventListener('click', () => {
      button.parentElement?.classList.toggle('collapsed')
    })
  })
}

initCodeBlocks()

/* ==========================================================================
   Tabs
   ========================================================================== */
class StarlightTabs extends HTMLElement {
  static syncedTabs = new Map()
  static storageKeyPrefix = 'starlight-synced-tabs__'

  constructor() {
    super()
    const tablist = this.querySelector('[role="tablist"]')
    if (!tablist) return
    this.tabs = [...tablist.querySelectorAll('[role="tab"]')]
    this.panels = [...this.querySelectorAll(':scope > [role="tabpanel"]')]
    this.syncKey = this.dataset.syncKey

    if (this.syncKey) {
      const synced = StarlightTabs.syncedTabs.get(this.syncKey) ?? []
      synced.push(this)
      StarlightTabs.syncedTabs.set(this.syncKey, synced)
    }

    this.tabs.forEach((tab, i) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault()
        const currentTab = tablist.querySelector('[aria-selected="true"]')
        if (e.currentTarget !== currentTab) this.switchTab(e.currentTarget, i)
      })

      tab.addEventListener('keydown', (e) => {
        const index = this.tabs.indexOf(e.currentTarget)
        const nextIndex =
          e.key === 'ArrowLeft'
            ? index - 1
            : e.key === 'ArrowRight'
              ? index + 1
              : e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? this.tabs.length - 1
                  : null
        if (nextIndex === null) return
        if (this.tabs[nextIndex]) {
          e.preventDefault()
          this.switchTab(this.tabs[nextIndex], nextIndex)
        }
      })
    })
  }

  switchTab(newTab, index, shouldSync = true) {
    if (!newTab) return

    const previousTabsOffset = shouldSync ? this.getBoundingClientRect().top : 0

    this.tabs.forEach((tab) => {
      tab.setAttribute('aria-selected', 'false')
      tab.setAttribute('tabindex', '-1')
    })
    this.panels.forEach((panel) => {
      panel.hidden = true
    })

    const newPanel = this.panels[index]
    if (newPanel) newPanel.hidden = false
    newTab.removeAttribute('tabindex')
    newTab.setAttribute('aria-selected', 'true')
    if (shouldSync) {
      newTab.focus()
      StarlightTabs.syncTabs(this, newTab)
      window.scrollTo({
        top: window.scrollY + (this.getBoundingClientRect().top - previousTabsOffset)
      })
    }
  }

  persistSyncedTabs(label) {
    if (!this.syncKey || typeof localStorage === 'undefined') return
    localStorage.setItem(StarlightTabs.storageKeyPrefix + this.syncKey, label)
  }

  static syncTabs(emitter, newTab) {
    const syncKey = emitter.syncKey
    const label = StarlightTabs.getTabLabel(newTab)
    if (!syncKey || !label) return
    const synced = StarlightTabs.syncedTabs.get(syncKey)
    if (!synced) return

    for (const receiver of synced) {
      if (receiver === emitter) continue
      const labelIndex = receiver.tabs.findIndex(
        (tab) => StarlightTabs.getTabLabel(tab) === label
      )
      if (labelIndex === -1) continue
      receiver.switchTab(receiver.tabs[labelIndex], labelIndex, false)
    }

    emitter.persistSyncedTabs(label)
  }

  static getTabLabel(tab) {
    return tab.textContent?.trim()
  }
}
if (!customElements.get('starlight-tabs')) {
  customElements.define('starlight-tabs', StarlightTabs)
}

// Restore synced tabs (inlined by the shortcode so it runs before paint)
class StarlightTabsRestore extends HTMLElement {
  connectedCallback() {
    const starlightTabs = this.closest('starlight-tabs')
    if (!(starlightTabs instanceof HTMLElement) || typeof localStorage === 'undefined') return
    const syncKey = starlightTabs.dataset.syncKey
    if (!syncKey) return
    const label = localStorage.getItem(`starlight-synced-tabs__${syncKey}`)
    if (!label) return
    const tabs = [...starlightTabs.querySelectorAll('[role="tab"]')]
    const panels = starlightTabs.querySelectorAll(':scope > [role="tabpanel"]')
    const tabIndexToRestore = tabs.findIndex((tab) => tab.textContent?.trim() === label)
    const newTab = tabs[tabIndexToRestore]
    const newPanel = panels[tabIndexToRestore]
    if (tabIndexToRestore < 1 || !newTab || !newPanel) return
    tabs[0]?.setAttribute('aria-selected', 'false')
    tabs[0]?.setAttribute('tabindex', '-1')
    panels?.[0]?.setAttribute('hidden', 'true')
    newTab.removeAttribute('tabindex')
    newTab.setAttribute('aria-selected', 'true')
    newPanel.removeAttribute('hidden')
  }
}
if (!customElements.get('starlight-tabs-restore')) {
  customElements.define('starlight-tabs-restore', StarlightTabsRestore)
}

/* ==========================================================================
   Hero — blur image fading on scroll
   ========================================================================== */
;(function () {
  const viewportHeight = window.innerHeight
  const threshold1 = viewportHeight / 9
  const threshold2 = (viewportHeight * 2) / 9
  const threshold3 = (viewportHeight * 3) / 9
  const image = document.getElementById('blurImage')
  if (!image) return

  window.addEventListener('scroll', () => {
    const scrollDistance = window.scrollY
    if (scrollDistance >= threshold3) image.style.opacity = '0.15'
    else if (scrollDistance >= threshold2) image.style.opacity = '0.3'
    else if (scrollDistance >= threshold1) image.style.opacity = '0.45'
  })
})()

/* ==========================================================================
   Quote — home page footer
   --------------------------------------------------------------------------
   `quote.html` only renders the placeholder; this fetches a random quote and
   evaluates the formatter from `params.quote.target`, matching the Astro
   original (`Quote.astro`).
   ========================================================================== */
class QuoteElement extends HTMLElement {
  connectedCallback() {
    const el = this.querySelector('#quote-sentence')
    const { server, target } = this.dataset
    if (!el || !server || !target) return
    let format
    try {
      format = new Function('data', `return (${target})(data)`)
    } catch {
      return
    }
    fetch(server)
      .then((response) => response.json())
      .then((data) => {
        const sentence = format(data)
        if (sentence) el.innerText = sentence
      })
      .catch(() => {
        el.innerText = 'Error'
      })
  }
}
if (!customElements.get('quote-component')) {
  customElements.define('quote-component', QuoteElement)
}

/* ==========================================================================
   Pagefind search
   ========================================================================== */
function initPagefind() {
  const el = document.getElementById('site-search')
  if (!el || typeof window.PagefindUI === 'undefined') return
  const base = document.body.dataset.baseurl || '/'
  const formatURL = (path) => path.replace(/(.)\/(#.*)?$/, '$1$2')
  new window.PagefindUI({
    element: '#site-search',
    baseUrl: base,
    bundlePath: `${base.replace(/\/$/, '')}/pagefind/`,
    showImages: false,
    showSubResults: true,
    processResult: (result) => {
      result.url = formatURL(result.url)
      result.sub_results = result.sub_results.map((sub) => {
        sub.url = formatURL(sub.url)
        return sub
      })
    }
  })
}

/* pagefind-ui.js is deferred and may not have executed yet when this bundle
 * runs, so wait for `load` before touching window.PagefindUI. */
const startPagefind = () => {
  if (document.getElementById('site-search')) initPagefind()
}
if (document.readyState === 'complete') startPagefind()
else window.addEventListener('load', startPagefind)

/* ==========================================================================
   Encrypted posts
   --------------------------------------------------------------------------
   The body and TOC of a post that declares `password` are encrypted at build
   time (see `scripts/encrypt-posts.mjs`): PBKDF2-SHA256 → AES-256-GCM, with a
   fresh random salt and nonce per build. This is the decrypting half and must
   derive the same key.

   The gate UI mirrors blog.en.icu's PasswordProtected component.
   ========================================================================== */
const DECRYPT_ITERATIONS = 250000

function base64ToBytes(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** payload = base64(salt(16) ‖ nonce(12) ‖ ciphertext) */
async function decryptPayload(payload, password) {
  const combined = base64ToBytes(payload)
  const salt = combined.slice(0, 16)
  const nonce = combined.slice(16, 28)
  const ciphertext = combined.slice(28)

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: DECRYPT_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext)
  return new TextDecoder().decode(plain)
}

/** Mark content images zoomable. Markdown images get the class in the render
 *  hook; raw `<img>` written by hand does not, so normalise here. */
export function markZoomable(root = document) {
  root.querySelectorAll('.prose img:not(.zoomable)').forEach((img) => img.classList.add('zoomable'))
}

markZoomable()

/** Re-runs everything that needs to see the freshly injected markup. */
function reinitAfterDecrypt(root) {
  markZoomable(root)
  initCodeBlocks(root)
  window.__pureZoom?.attach?.('.prose .zoomable')
  window.dispatchEvent(new CustomEvent('pure:content-injected', { detail: { root } }))
}

function initEncryptedPost() {
  const container = document.getElementById('encrypted-content')
  if (!container) return

  const contentPayload = container.getAttribute('data-encrypted')
  const tocPayload = container.getAttribute('data-toc-encrypted')

  const form = document.getElementById('password-form')
  const input = document.getElementById('password-input')
  const button = document.getElementById('decrypt-btn')
  const errorEl = document.getElementById('error-message')
  const target = document.getElementById('decrypted-content')
  const warning = document.getElementById('browser-warning')
  const inputRow = document.getElementById('password-input-container')
  const httpsLink = document.getElementById('https-link')

  if (!form || !input || !button || !target) return

  /* The gate's initial text is `params.encrypt.error` — reuse it so the message
     stays configurable from hugo.toml. */
  const wrongPasswordMessage = errorEl?.textContent.trim() || '密码错误，请重试'

  const showError = (message) => {
    if (!errorEl) return
    errorEl.textContent = message
    errorEl.style.opacity = '1'
    setTimeout(() => {
      errorEl.style.opacity = '0'
    }, 3000)
  }

  /* Web Crypto is only exposed in a secure context — flag plain HTTP instead of
     letting the user type a password into a form that can never work. */
  if (!window.crypto?.subtle) {
    if (warning && inputRow && httpsLink) {
      warning.classList.remove('hidden')
      inputRow.classList.add('opacity-50', 'pointer-events-none')
      const https = window.location.href.replace('http://', 'https://')
      httpsLink.textContent = https
      if (window.location.protocol !== 'https:') {
        warning.style.cursor = 'pointer'
        warning.title = '点击尝试跳转到 HTTPS 版本'
        warning.addEventListener('click', () => {
          window.location.href = https
        })
      }
    }
    input.disabled = true
    button.disabled = true
    return
  }

  const unlockedKey = `pure-unlocked:${window.location.pathname}`
  const passwordKey = `pure-password:${window.location.pathname}`

  const unlock = async (password, fromStorage = false) => {
    try {
      const decodedContent = await decryptPayload(contentPayload, password)
      target.innerHTML = decodedContent
      target.classList.remove('hidden')
      // `.hidden` loses to the gate's own `.flex` (same specificity, earlier in
      // the stylesheet), so toggle the attribute instead.
      form.hidden = true

      if (tocPayload) {
        const sidebar = document.getElementById('sidebar')
        if (sidebar) sidebar.innerHTML = await decryptPayload(tocPayload, password)
      }

      // Scripts injected via innerHTML never run — re-create them.
      target.querySelectorAll('script').forEach((old) => {
        const script = document.createElement('script')
        if (old.src) script.src = old.src
        else script.textContent = old.textContent
        old.replaceWith(script)
      })

      reinitAfterDecrypt(target)

      try {
        sessionStorage.setItem(unlockedKey, 'true')
        sessionStorage.setItem(passwordKey, password)
      } catch {
        /* private mode — the unlock just will not survive a reload */
      }

      container.removeAttribute('data-encrypted')
      container.removeAttribute('data-toc-encrypted')
    } catch (err) {
      try {
        sessionStorage.removeItem(unlockedKey)
        sessionStorage.removeItem(passwordKey)
      } catch {
        /* ignore */
      }
      if (!fromStorage) showError(wrongPasswordMessage)
      console.error('decrypt failed:', err)
    }
  }

  const submit = async () => {
    if (!contentPayload) {
      // No vault entry: the ciphertext was never generated for this build.
      showError(
        document.querySelector('[data-encrypt-missing]')?.dataset.encryptMissing ||
          '密文尚未生成，请先运行 npm run encrypt。'
      )
      return
    }
    const password = input.value.trim()
    if (!password) {
      showError(input.placeholder || '请输入密码')
      return
    }
    button.disabled = true
    button.textContent = '解密中...'
    await unlock(password)
    button.disabled = false
    button.textContent = '解锁'
  }

  button.addEventListener('click', submit)
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submit()
  })

  /* Restore a previous unlock for this tab. */
  try {
    if (sessionStorage.getItem(unlockedKey) === 'true') {
      const saved = sessionStorage.getItem(passwordKey)
      if (saved) unlock(saved, true)
    }
  } catch {
    /* ignore */
  }
}

initEncryptedPost()

/* ==========================================================================
   Site uptime — footer
   ========================================================================== */
;(function () {
  const el = document.getElementById('site-age')
  if (!el) return
  const start = new Date(el.dataset.start)
  if (Number.isNaN(start.getTime())) return

  const update = () => {
    let diff = Math.max(0, Date.now() - start.getTime())
    const days = Math.floor(diff / 86400000)
    diff %= 86400000
    const hours = Math.floor(diff / 3600000)
    diff %= 3600000
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    el.textContent = `${days} 天 ${hours} 时 ${minutes} 分 ${seconds} 秒`
  }

  update()
  setInterval(update, 1000)
})()
