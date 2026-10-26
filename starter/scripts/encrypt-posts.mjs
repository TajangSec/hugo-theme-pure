#!/usr/bin/env node
/**
 * Generates the encrypted vault for posts that declare `password` in front matter.
 *
 * Where this sits in the pipeline is the whole point:
 *
 *   npm run css  →  npm run encrypt  →  hugo  →  pagefind
 *                     ├─ hugo → .encrypt-tmp/   (throwaway: plaintext exists only here)
 *                     └─ data/encrypted/*.json  (ciphertext)
 *
 * Hugo has no symmetric-cipher template functions — only hashes — so encryption
 * cannot happen inside a template. It can, however, happen *before* the render
 * that gets published. That is what this does: `public/` never contains
 * plaintext, and a bare `hugo` build degrades to a "ciphertext not generated
 * yet" notice rather than silently shipping the article.
 *
 * Crypto: PBKDF2-SHA256 (250 000 iterations) → AES-256-GCM, fresh random salt
 * and nonce per run. The browser half lives in `themes/pure/assets/js/main.js`
 * and must derive the same key.
 *
 * Threat model:
 *   ✔ The published HTML never contains the plaintext body or the TOC.
 *   ✔ The password never enters `public/`; it is read from the source Markdown.
 *   ✔ The ciphertext is authenticated, so a wrong password fails loudly.
 *   ✘ Title, description, tags, URL and cover image still ship. Keep them bland.
 *   ✘ A short password is brute-forceable offline by anyone holding the HTML.
 */
import { createHash, randomBytes, webcrypto } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ITERATIONS = 250_000
const CONTENT_DIR = process.env.CONTENT_DIR ?? 'content'
const VAULT_DIR = process.env.VAULT_DIR ?? join('data', 'encrypted')
const TMP_DIR = process.env.ENCRYPT_TMP ?? '.encrypt-tmp'

const contentMarker = /<!--encrypt:content-->([\s\S]*?)<!--\/encrypt:content-->/
const tocMarker = /<!--encrypt:toc-->([\s\S]*?)<!--\/encrypt:toc-->/

/* ------------------------------------------------------------------ helpers */

function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, test, out)
    else if (test(full)) out.push(full)
  }
  return out
}

/** Reads `password:` from a post's YAML/TOML front matter. */
function readPassword(file) {
  const head = readFileSync(file, 'utf8').slice(0, 4096)
  const fm = head.match(/^(?:---\n([\s\S]*?)\n---|\+\+\+\n([\s\S]*?)\n\+\+\+)/)
  if (!fm) return null
  const m = (fm[1] ?? fm[2] ?? '').match(/^\s*password\s*[:=]\s*(.+?)\s*$/m)
  if (!m) return null
  const value = m[1].trim().replace(/^(['"])(.*)\1$/, '$2')
  return value.length ? value : null
}

/**
 * Vault key. A hash rather than a slugified path: the latter stripped non-ASCII
 * characters, so every all-CJK folder name collapsed to the same key.
 * Mirrors `sha1` + 12 chars in `layouts/partials/encrypted-body.html`.
 */
const slugOf = (key) => createHash('sha1').update(key).digest('hex').slice(0, 12)

/* Hugo's minifier drops redundant attribute quotes (`data-encrypt=x`), so never
   assume the quoted form. */
const attrPattern = (name) => new RegExp(`${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`)
const readAttr = (html, name) => {
  const m = html.match(attrPattern(name))
  return m ? (m[1] ?? m[2] ?? m[3]) : null
}

async function encrypt(password, plaintext) {
  const { subtle } = webcrypto
  const salt = randomBytes(16)
  const nonce = randomBytes(12)
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const ciphertext = Buffer.from(
    await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(plaintext))
  )
  return Buffer.concat([salt, nonce, ciphertext]).toString('base64')
}

/* --------------------------------------------------------------------- main */

function collectPasswords() {
  const map = new Map()
  if (!existsSync(CONTENT_DIR)) return map
  for (const file of walk(CONTENT_DIR, (f) => /\.(md|markdown)$/.test(f))) {
    const password = readPassword(file)
    if (!password) continue
    // Hugo's `.File.Path` is relative to the content dir, with forward slashes.
    map.set(relative(CONTENT_DIR, file).split(sep).join('/'), password)
  }
  return map
}

/**
 * Renders the site once into a throwaway directory with the plaintext enabled.
 * Everything it writes is deleted before this script returns.
 */
function renderPlaintextPass() {
  rmSync(TMP_DIR, { recursive: true, force: true })
  mkdirSync(TMP_DIR, { recursive: true })
  const passConfig = join(TMP_DIR, 'pass.toml')
  writeFileSync(passConfig, '[params.encrypt]\n  emitPlaintext = true\n')

  const result = spawnSync(
    'hugo',
    ['--quiet', '--destination', TMP_DIR, '--config', `hugo.toml,${passConfig}`],
    { stdio: 'inherit' }
  )
  if (result.status !== 0) {
    rmSync(TMP_DIR, { recursive: true, force: true })
    console.error('encrypt-posts: the plaintext render pass failed')
    process.exit(1)
  }
}

async function main() {
  const passwords = collectPasswords()
  if (passwords.size === 0) {
    console.log('encrypt-posts: no posts declare `password`, nothing to do')
    return
  }

  renderPlaintextPass()

  const vault = {}
  const consumed = new Set()
  const plaintexts = []

  for (const file of walk(TMP_DIR, (f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8')
    const key = readAttr(html, 'data-encrypt')
    if (!key) continue

    const password = passwords.get(key)
    if (!password) {
      console.error(`encrypt-posts: "${key}" is marked encrypted but declares no password`)
      process.exit(1)
    }

    const content = html.match(contentMarker)?.[1]
    if (!content) {
      console.error(
        `encrypt-posts: ${file} carries no plaintext markers — was the pass rendered with emitPlaintext?`
      )
      process.exit(1)
    }
    const toc = html.match(tocMarker)?.[1] ?? ''

    plaintexts.push(content)
    vault[slugOf(key)] = {
      content: await encrypt(password, content),
      ...(toc.trim() ? { toc: await encrypt(password, toc) } : {}),
      // KaTeX CSS is only linked when `hasMath` is set. The published render
      // never sees the plaintext, so record the flag from this pass and let
      // `encrypted-body.html` restore it.
      ...(/class="katex/.test(content) || /class="katex/.test(toc) ? { hasMath: true } : {}),
      ...(/class="mermaid"/.test(content) ? { hasMermaid: true } : {}),
    }
    consumed.add(key)
  }

  rmSync(TMP_DIR, { recursive: true, force: true })

  for (const key of [...passwords.keys()].filter((k) => !consumed.has(k))) {
    console.warn(`encrypt-posts: ${key} declares a password but produced no page (draft?)`)
  }
  if (consumed.size === 0) {
    console.error('encrypt-posts: no encrypted page was found — refusing to write an empty vault')
    process.exit(1)
  }

  mkdirSync(VAULT_DIR, { recursive: true })
  // Drop vault entries for posts that no longer exist.
  const known = new Set(Object.keys(vault))
  for (const f of walk(VAULT_DIR, (f) => f.endsWith('.json'))) {
    const name = f.slice(VAULT_DIR.length + 1, -'.json'.length)
    if (!known.has(name)) rmSync(f)
  }
  for (const [slug, payload] of Object.entries(vault)) {
    writeFileSync(join(VAULT_DIR, `${slug}.json`), `${JSON.stringify(payload)}\n`)
  }

  /* ------------------------------------------------------------ verification */

  // Belt and braces: nothing we just encrypted may still be readable in public/.
  const decode = (s) =>
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp|ldquo|rdquo|hellip);/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const samples = plaintexts
    .map((body) => {
      const text = decode(body)
      const start = Math.floor(text.length * 0.3)
      return text.slice(start, start + 80)
    })
    .filter((s) => s.length >= 40)

  if (samples.length && existsSync('public')) {
    const hits = walk('public', (f) => /\.(html|xml|json|txt|js)$/.test(f)).filter((f) => {
      const text = readFileSync(f, 'utf8')
      return samples.some((s) => text.includes(s))
    })
    if (hits.length) {
      console.error('encrypt-posts: an encrypted body is still readable in public/:')
      for (const f of hits) console.error(`  ${f}`)
      process.exit(1)
    }
  }

  const names = Object.keys(vault)
  console.log(`encrypt-posts: wrote ${names.length} vault entr(ies) — ${names.join(', ')}`)
}

await main()
