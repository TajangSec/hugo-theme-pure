# hugo-theme-pure

用 [Hugo](https://gohugo.io/) 重建的 [`astro-theme-pure`](https://github.com/cworld1/astro-theme-pure) 主题。
几乎完全一样，支持文章加密，文章分类，对一些细节做了处理。

- 主题仓库：<https://github.com/TajangSec/hugo-theme-pure>
- 作者主页：<https://github.com/TajangSec>
- 示例站点：<https://h4cker.zip/>

---

## 目录结构

本仓库就是主题本体，可直接作为 Hugo 的 `themes/` 子模块使用：

```
hugo-theme-pure/
├── layouts/           模板（页面 / 局部 / 短代码 / markdown 渲染钩子）
├── assets/css/        token / 排版 / 组件 / 生成产物
├── assets/js/main.js  全部前端交互
├── data/icons.json    内置图标（从原版 icons.ts 转换）
├── archetypes/        新建文章模板
├── static/            字体与图标
└── theme.toml         主题元数据
```

> `assets/css/uno.css` 与 `chroma.css` 是**生成产物且已提交**，
> 所以使用主题只需 `hugo` 一条命令，不需要 Node。

---

## 安装

### 作为 git 子模块（推荐）

```bash
git submodule add https://github.com/TajangSec/hugo-theme-pure.git themes/pure
```

在站点配置中启用：

```toml
# hugo.toml
theme = 'pure'
```

### 直接复制

```bash
git clone https://github.com/TajangSec/hugo-theme-pure.git
cp -r hugo-theme-pure /path/to/my-site/themes/pure
```

---

## 快速开始

把下面「配置」章节里的 `[params]` 段落复制到你的 `hugo.toml` 作为起点，
然后运行：

```bash
hugo server
```

主题的样式与交互已经包含在仓库中。**不使用加密和站内搜索时，不需要 Node**：

| 你要做的事 | 命令 |
| --- | --- |
| 日常写作、本地预览 | `hugo server` |
| 生成发布文件 | `hugo` |
| 文章用 `password` 加密 | `npm run dev` / `npm run build` |
| 需要站内搜索（Pagefind） | `npm run build` |
| 只启动 Hugo、不重新加密 | `npm run preview` |

### 日常使用（加密与搜索）

加密必须发生在 Hugo 渲染**之前**（否则明文会进入 `public/`），Pagefind 索引必须
在构建**之后**生成。使用这两项功能时，把本仓库 `starter/` 下的文件复制到站点根目录：

```
your-site/
├── package.json                 # dev / build / preview / encrypt / search
└── scripts/encrypt-posts.mjs    # 加密脚本
```

然后：

```bash
npm install       # 只需一次

npm run dev       # 预览：先加密文章，再启动 Hugo
npm run build     # 发布：加密 → hugo --minify → Pagefind 索引
npm run preview   # 只启动 Hugo，不重新加密
```

> 只跑裸 `hugo` 时，带 `password` 的文章会提示“密文尚未生成”；开发模式下
> 搜索页会显示 “Dev mode, the search is disabled.”，搜索请在 `npm run build`
> 后用静态服务器预览 `public/`。

### 开发主题 / 贡献

本仓库不包含 UnoCSS 构建工具链。修改模板里的 class、重新生成 `uno.css` 时，
需要在配套演示站（包含 `uno.config.ts` 与完整的 `package.json`）中运行：

```bash
npm install
npm run css        # 重新生成 uno.css / chroma.css
```

> 加密文章必须在 Hugo 渲染**之前**完成加密，所以开发与发布请使用
> `npm run dev` 或 `npm run build`，不要只跑裸 `hugo`。

---

## 更新主题

以 git submodule 安装时，更新分三步：

```bash
# 1. 拉取主题最新提交
git submodule update --remote themes/pure

# 2. 在站点仓库记录新的子模块指针
git add themes/pure
git commit -m "chore: update theme"

# 3. 重新构建
npm run build        # 使用了加密或搜索
# 或
hugo
```

### 注意事项

- **不要**直接 `cd themes/pure && git pull`：子模块通常处于 detached HEAD，
  请使用 `git submodule update --remote`。
- 站点根目录的 `scripts/encrypt-posts.mjs` 是从 `starter/` 复制的，**不会**
  随子模块更新。主题修改了加密脚本时，需要手动同步：

  ```bash
  cp themes/pure/starter/scripts/encrypt-posts.mjs scripts/encrypt-posts.mjs
  ```

- 更新后查看本 README 与提交记录；如果依赖有变化，重新运行 `npm install`。

### 回滚

```bash
cd themes/pure
git log --oneline          # 找到要回到的提交
git checkout <commit>
cd ../..
git add themes/pure
git commit -m "chore: pin theme to <commit>"
```

### 克隆带子模块的站点

```bash
git clone --recurse-submodules <your-site-repo>
# 或克隆后
git submodule update --init --recursive
```

---

## 配置

所有主题参数都在 `hugo.toml` 的 `[params]` 下，命名尽量对应原版 `src/site.config.ts`。

### 基础

| 参数 | 说明 | 原版对应 |
| --- | --- | --- |
| `title` | 站点标题（Hugo 原生） | `theme.title` |
| `params.author` | 作者，用于页脚与版权卡片 | `theme.author` |
| `params.description` | 站点描述 | `theme.description` |
| `params.favicon` | favicon 路径 | `theme.favicon` |
| `params.socialCard` | 默认 OG 图 | `theme.socialCard` |
| `params.titleDelimiter` | `<title>` 分隔符，默认 `•` | `theme.titleDelimiter` |
| `params.npmCDN` | 运行时依赖的 CDN 前缀 | `theme.npmCDN` |
| `params.location` / `params.sourceCode` / `params.getTemplate` | 首页头像下方的标签与胶囊 | — |

### 本地化与日期

```toml
[params.locale]
  lang = 'zh-CN'
  attrs = 'zh_CN'
  # Go 的时间布局，不是 Intl 选项
  dateFormat = '2006年1月2日'          # 页面上显示的样子
  longDateFormat = '2006年1月2日'      # 版权卡片里的样子
  datetimeFormat = '2006-01-02 15:04'  # 鼠标悬停时的原生 tooltip
```

**文章页**的日期悬停时会浮出精确时间（`datetimeFormat` 控制格式）。实现是纯 CSS 气泡
挂在 `<time>` 的 `::after` 上，不需要 JS，也不用 `title` 属性：

```html
<time class="font-sans date-tip"
      datetime="2025-02-09T09:12:00+08:00"
      data-tip="2025-02-09 09:12">Feb 9, 2025</time>
```

悬停提示出现在所有展示日期的地方：文章页（发布 + 更新）、首页、博客列表、归档、
标签页、分类页。

> 为什么不用浏览器原生的 `title`：原生 tooltip 由浏览器 UI 层绘制，各平台延迟/样式不一致，
> 有时干脆不出现。CSS 气泡是确定可见的。
>
> 只显示到分钟。想精确到秒就把 `datetimeFormat` 改成 `'2006-01-02 15:04:05'`。

tooltip 里的时间来自 front matter 的 `date` / `lastmod`。只写日期（`date: 2025-02-09`）会显示
`00:00`；想精确到分钟就写 `date: 2025-02-09T09:12:00+08:00`。

原版的 `dateOptions` 是 `Intl.DateTimeFormat` 选项，Hugo 用的是 Go reference layout，
所以这里换成了 `dateFormat` / `longDateFormat` 两个布局字符串。
默认值 `Jan 2, 2006` / `January 2, 2006` 与原版英文站点一致。

### 头部与页脚

```toml
[[params.header.menu]]
  title = 'Blog'
  link = '/blog'

[params.footer]
  year = '© 2026'
  credits = true                     # 显示 “Hugo & Pure theme powered”
  startDate = '2020-01-01T00:00:00+08:00'   # 页脚「站点已运行」的起点；留空则不显示
  [[params.footer.links]]            # pos = 1 单独一行，pos = 2 追加到版权行
    title = 'Moe ICP 114514'
    link = 'https://icp.gov.moe/?keyword=114514'
    style = 'text-sm'
  [[params.footer.social]]
    icon = 'github'                  # data/icons.json 里的键名
    label = 'GitHub'
    href = 'https://github.com/...'
```

### 内容与排版

```toml
[params.typography]
  class = 'prose text-base'          # 正文容器的 class
  blockquoteStyle = 'italic'
  inlineCodeBlockStyle = 'modern'

[params.content]
  share = ['weibo', 'x', 'bluesky']  # 版权卡片上的分享按钮

[params.codeBlock]
  collapseAfter = 15                 # 超过多少行折叠代码块
```

### 字体

Satoshi 字体文件已放在主题里，开箱即用，不依赖任何 CDN：

```
themes/pure/static/fonts/
├── satoshi-400.woff2          ├── satoshi-500.woff2
├── satoshi-400-italic.woff2   └── satoshi-500-italic.woff2
```

`themes/pure/assets/css/fonts.css` 里声明了 `@font-face`，并复刻了 Astro 字体服务生成的
**metric-matched fallback**（`size-adjust: 98.9231%` / `ascent-override` / `descent-override`
/ `line-gap-override`），这样字体加载前后不会有布局跳动。

要换成自己的字体：把 woff2 放进 `static/fonts/`（站点级会覆盖主题级），改 `fonts.css`
里的文件名即可。Satoshi 采用 ITF Free Font License，个人与商用均免费。

> 顺带一提：正文里的时间戳用的是 `font-mono`（等宽）—— 列表页是等宽 + `--muted-foreground`，
> 文章页顶部的日期则被 `font-sans` 覆盖回正文字体，这个「怪癖」也和原版一致。

### 高亮色

每页顶部那层渐变色、文章页右侧目录的选中色与左侧进度条，都取自同一个「高亮色」：

```html
<!-- 渲染出来大致是这样 -->
<body style="--highlight-color:#9ab8d4">
  <div id="highlight-gradient" class="…opacity-25"></div>
```

取值优先级：`highlightColor` → `heroImageColor` → 无（回落到 `--primary`）。
和 Astro 版一致，**颜色需要显式写在 front matter 里**（Astro 的 `heroImage.color` 也是手写的）。

如果你希望从封面图自动取主色，可以打开开关（用 Hugo 的 `image.Colors`，
只对 page bundle 里的图片生效）：

```toml
[params.highlight]
  autoFromHeroImage = true
```

默认关闭 —— 封面主色可能是很深的颜色，自动取色未必好看。

### 可选功能

```toml
[params.mediumZoom]                  # 图片点击放大
  enable = true
  selector = '.prose .zoomable'

[params.quote]                       # 首页底部随机句子
  server = 'https://dummyjson.com/quotes/random'
  target = "(data) => data.quote || 'Error'"
```

搜索用 [Pagefind](https://pagefind.app/)，无需配置；`npm run build` 会自动建立索引。
开发模式下搜索页会显示 “Dev mode, the search is disabled.”，与原版一致。

---

## 写作

`hugo new blog/my-post.md` 会使用 `themes/pure/archetypes/default.md`。

### Front matter

```yaml
---
title: '文章标题'          # 必填，建议 ≤ 60 字
slug: '7f6bb3'             # 决定 URL：/7f6bb3/（hugo new 会自动生成）
description: '摘要'        # 必填，用在卡片与 meta
date: 2026-10-22           # 发布日期 → publishDate
lastmod: 2026-10-22        # 更新时间 → updatedDate
tags: ['css', 'pku']
categories: ['Documentation']   # 分类（原版没有，这里补上）
language: '中文'
heroImage: '/images/cover.png'   # 静态路径，或 page bundle 里的资源名
heroImageColor: '#9ab8d4'        # 该文章的高亮色（对应 Astro 的 heroImage.color）
highlightColor: '#659EB9'        # 同上，优先级更高；首页也用它
pin: true                        # 置顶
toc: false                       # 关掉右侧目录
comment: true
math: true                       # 开启该页的公式渲染（Mermaid 无需开关，写 ```mermaid 即可）
---
```

### 分类与标签

站内有两套 taxonomy：

```toml
[taxonomies]
  tag = 'tags'
  category = 'categories'
```

| | 在哪 | 长什么样 |
| --- | --- | --- |
| **分类** | `/blog/` 右侧栏**上方** | 竖排目录 + 计数（`Documentation 3`），点进 `/categories/<term>/` |
| **标签** | `/blog/` 右侧栏**下方** | pill 云，点进 `/tags/<term>/` |

分类用竖排列表而不是 pill，是为了和标签在视觉上分层：分类是「栏目」，标签是「关键词」。
索引页 `/categories/` 与 `/tags/` 共用同一个模板，标题由 `.Data.Plural` 决定。
每套 taxonomy 都有自己的 RSS（如 `/categories/documentation/rss.xml`），只含该分类下的文章。

> 分类是原版没有的功能。想改成横向 pill、或者加进顶部导航，改
> `layouts/blog/list.html` 里的 sidebar 块即可。

### URL 结构

文章地址直接挂在域名后面，不带 `/blog/` 前缀 —— 和 [h4cker.zip](https://h4cker.zip/) 一致：

```
https://example.com/7f6bb3/
https://example.com/04c13b/
```

靠的是 Hugo 原生的 `[permalinks]`（`hugo.toml`）：

```toml
[permalinks]
  blog = '/:slug/'
```

`slug` 由 archetype 自动生成，算法与 HackYourHeart 相同 —— `md5(文件名|时间戳)` 取前 6 位：

```go
slug: '{{ substr (md5 (printf "%s|%d" (replace .Name "-" "") now.Unix)) 0 6 | lower }}'
```

所以 `hugo new content blog/my-post.md` 会直接得到 `slug: '5cd97b'` 这样的短 id。
想改成可读的地址（如 `/vm/`）就在 front matter 里手写 `slug: 'vm'`，
或者用 `url: '/vm/'` 整段覆盖。

> 改 permalink 会让旧 URL 404。已经有外链的话，补 `aliases: ['/blog/old-slug/']`。
> 站内所有链接都用 `.RelPermalink` 生成，改配置后自动跟随，无需动模板。

### 短代码

**布局类**

```markdown
{{< section title="About" >}} …markdown… {{< /section >}}   <!-- 首页两栏区块 -->
{{< posts count="10" />}}                                   <!-- 最新文章列表 -->
{{< card heading="…" subheading="…" date="…" href="…" />}}
{{< project-card heading="…" subheading="…" image="/images/1.avif" href="…" />}}
{{< project-section >}}                                     <!-- 每行：名字 | 描述 | github:url, site:url -->
{{< skills title="Web" items="Vue.js, Nuxt.js, Node.js" />}}
{{< buttons title="Design" items="Photoshop:Picture Editing,Illustrator:Vector Drawing" />}}
```

**内容类**

```markdown
{{< aside type="tip" title="可选标题" >}} … {{< /aside >}}   <!-- note / tip / caution / danger -->
{{< collapse title="展开" >}} … {{< /collapse >}}
{{< steps >}}
1. 第一步
2. 第二步
{{< /steps >}}

{{< tabs >}}
{{< tab label="pnpm" >}} …markdown… {{< /tab >}}
{{< tab label="npm" >}} …markdown… {{< /tab >}}
{{< /tabs >}}

{{< timeline >}}
2024-04-29 | 上线 <a href="https://astro.build/">Astro</a> 版本
2026-10-22 | 移植到 Hugo
{{< /timeline >}}

{{< spoiler >}}点开才可见{{< /spoiler >}}
{{< button title="更多" href="/about" variant="ahead" />}}
```

**友链页**

```markdown
{{< friend-list group="0" />}}   <!-- 读取 data/links.json 的 friends[0] -->
{{< apply-tip />}}               <!-- 站点信息，点击复制 -->
{{< sponsorship />}}
{{< sponsors />}}                <!-- 读取 data/sponsors.json -->
```

> 单次出现的短代码请用自闭合写法 `{{< card … />}}`，否则 Hugo 会要求补上 `{{< /card >}}`。

### 代码块

行号、语言标签、复制按钮、折叠都已内置。

**围栏选项**（Chroma 语法，`{…}` 里可以写多个，逗号分隔）：

````markdown
```js {hl_lines=["9-12",14,16],linenostart=78,title="app.js"}
````

| 选项 | 作用 |
| --- | --- |
| `hl_lines` | 高亮指定行，支持单行与区间：`[3, "9-12"]` |
| `linenostart` | 起始行号（默认 1） |
| `title` | 代码块左上角的标题 |
| `linenos` | `inline`（默认）／`table`／`false` |

**Shiki 记号**（与原版一致，可与上面的选项混用；显式的 `hl_lines` 优先）：

````markdown
```js
// [!code highlight]      高亮本行
// [!code highlight:3]    从本行起高亮 3 行
// [!code ++]             标记为新增
// [!code --]             标记为删除
// [\!code ++]            转义：原样显示记号本身
```
````

> 注意：原版用的是 ```` ```js title="a.js" ````，Hugo 会丢弃不带花括号的属性，
> 所以迁移时需要改成 ```` ```js {title="a.js"} ````。

### 按需加载

页面上用不到的东西不会发出去 —— 依赖由渲染时的 `.Store` 标记驱动，不是打包时写死的：

| 资源 | 只在 |
| --- | --- |
| KaTeX 样式表 | 该页有公式（`math` 开启且用了 `$…$`） |
| Mermaid（`import()` 动态加载） | 该页有 ```mermaid 代码块 |
| Medium Zoom（图片灯箱） | 该页正文里有图片 |
| qrcodejs | 文章页的版权卡片 |
| Pagefind UI | 搜索页 |
| 主 JS bundle | 每页（约 20KB，含主题切换、目录、复制等） |

实测（`public/` 产物）：

```
页面              katex  mermaid  zoom  qrcode  pagefind
有公式(带图)        ✓       —      ✓      ✓        —
有 mermaid          —       ✓      —      ✓        —
纯文字文章          —       —      —      ✓        —
加密文章            —       —      ✓      ✓        —
首页/列表/搜索页     —       —      —      —        ✓(仅搜索)
```

> Mermaid 是**围栏自动检测**：页面出现 `` ```mermaid `` 代码块就会渲染，不需要
> front matter 开关（与公式不同）。Hugo 的钩子按围栏语言精确匹配 `mermaid`，
> 普通代码块（`` ```js ``、`` ```php ``）即使内容里出现 “mermaid” 字样也不会被当成图。
> 库通过 `import()` 懒加载，只有页面真的有图时才会去 CDN 拉那个 ~500KB 的库；
> 加密文章解锁前不会加载，解锁后检测到图才渲染。想展示源码请用 `` ```text `` 围栏。

### 加密文章

在 front matter 里加一行 `password`，正文和目录就会在构建时加密：

```yaml
---
title: '密码保护测试文章（演示密码 123456）'
date: 2025-03-01
password: '123456'       # 明文密码，只存在于源文件（演示站用的是公开密码）
---
正文……（可以正常用短代码、公式、代码块）
```

**为什么需要一个构建脚本**：Hugo 的模板函数里只有哈希（`sha256` / `hmac` / `fnv*`），
没有任何对称加密，模板也无法执行任意代码（`js.Build` 只打包不执行）。所以加密必然发生在
Hugo 之外——差别只在**放在哪一步**：

```
npm run css  →  npm run encrypt  →  hugo  →  pagefind
                 ├─ hugo → .encrypt-tmp/   （一次性：明文只出现在这里，跑完即删）
                 └─ data/encrypted/*.json  （密文，已 .gitignore）
```

脚本先跑一遍**一次性的** Hugo 渲染（`encrypt.emitPlaintext = true`），把正文和目录抠出来
加密，写进 vault，然后删掉临时目录。正式构建从 vault 里读密文。

这带来的关键性质：

| 场景 | 结果 |
| --- | --- |
| `npm run build` | `public/` 里**从头到尾没有明文** |
| `npm run dev` | 每次启动都会先跑一次 `encrypt`，dev 页面也只有密文 |
| 忘了跑脚本，直接 `hugo` | 加密文章显示「密文尚未生成」，**不会泄露** |

（HackYourHeart 的做法是 `hugo` 之后用 python 改 `public/`，明文会先落地一次；
忘了跑脚本就是全站明文。这里把顺序调换过来了。）

**加密参数**：PBKDF2-SHA256（250 000 次迭代）→ AES-256-GCM，每次重新生成随机 salt 与 nonce。
浏览器端用 Web Crypto 解密（`themes/pure/assets/js/main.js`），解锁后会重新初始化
目录高亮、代码块复制、图片缩放这些动态组件。

> 参考站 blog.en.icu 的版本不能直接抄：它是 AES-CBC + 把密码补 `0` 到 32 字节直接当密钥，
> 没有 KDF、没有盐、没有认证，短密码秒破。这里只抄它的**样式与交互**（密码框、解锁按钮、
> 错误提示、`sessionStorage` 记住本次会话、非 HTTPS 警告），列表页的锁图标也一致。

**已经堵住的泄露面**：

| 渠道 | 处理 |
| --- | --- |
| 正文 HTML | 加密 |
| 右侧目录（标题会泄露内容） | 加密，解锁后注入 |
| RSS / Atom 的 `<content:encoded>` | 加密文章只输出摘要 |
| Pagefind 搜索索引 | 容器带 `data-pagefind-ignore` |
| 密码本身 | 只在源文件里，从不进入渲染 |

**仍然会公开**（自己把握）：标题、`description`、标签、URL、封面图。

**已知局限**：短密码可以被拿到 HTML 的人离线爆破，请用长密码。

主题文案可以在 `hugo.toml` 里覆盖：

```toml
[params.encrypt]
  title = '此内容受密码保护'
  hint = '请输入密码以查看内容'
  placeholder = '请输入密码'
  unlock = '解锁'
  error = '密码错误，请重试'
  backHome = '返回首页'
  badge = '加密文章'
  missing = '这篇文章已加密，但密文尚未生成。请先运行 npm run encrypt。'
```

### 数学

`$inline$` 与 `$$block$$` 由 Hugo 内置的 KaTeX 在构建期渲染（`transform.ToMath`），
输出 `htmlAndMathml`，与 Astro 版 `rehype-katex` 的结果一致；KaTeX 样式表只在有公式的页面加载。

想换成更轻的纯 MathML 输出（不需要 KaTeX CSS，体积更小）：

```toml
[params.math]
  output = 'mathml'   # 默认 htmlAndMathml
```

### Markdown 渲染钩子

`themes/pure/layouts/_default/_markup/` 下的钩子逐一对齐了原版的 rehype/remark 插件：

| 钩子 | 对应原版 | 作用 |
| --- | --- | --- |
| `render-heading.html` | `rehypeAutolinkHeadings` | 标题末尾追加隐藏的 `#` 锚点，hover 显现 |
| `render-link.html` | `rehypeExternalLinks` | 外链加 `rel="nofollow noopener noreferrer"` + `target="_blank"` + ` ↗` |
| `render-image.html` | `remarkAddZoomable` | 图片加 `zoomable`（medium-zoom 依赖）、解析 page bundle 相对路径、输出宽高避免抖动 |
| `render-codeblock.html` | shiki transformers + Chroma fence options | 标题 / 语言 / 行号 / 复制 / 折叠 / `hl_lines` / `linenostart` / diff / highlight 记号 |
| `render-passthrough.html` | `remark-math` + `rehype-katex` | KaTeX 公式 |

---

## 与原版的差异

**视觉与交互**：首页、博客列表/分页、文章页（目录、阅读进度、版权卡片、分享、上下篇）、
归档、标签、友链、关于、项目、搜索、404、RSS 都已对齐。

**已知差异**

| 项目 | 说明 |
| --- | --- |
| URL 结构 | 原版是 `/blog/<id>/`；这里按需求改成根级 `/<slug>/`（见上文「URL 结构」）。末尾斜杠由 Hugo 决定，需要去掉请在托管侧重写。 |
| 日期格式 | 用 Go layout（`dateFormat`）代替 `Intl` 选项。 |
| 代码块标题 | 需要 `{title="…"}` 花括号写法，见上。 |
| 高亮色 | 原版由 Astro 的 image service 提供 `heroImage.color`；这里同样在 front matter 手写 `heroImageColor`，另可选开启 `params.highlight.autoFromHeroImage` 自动取色。 |
| 字体 | Satoshi 已自托管在 `themes/pure/static/fonts/`（latin 子集，400/500 × normal/italic），并带了 Astro 生成的 metric-matched fallback（`size-adjust: 98.9231%` 等），与原版渲染完全一致。 |
| 代码高亮 | 原版用 Shiki（github-light / github-dark），这里用 Chroma 的 `github` / `github-dark`，配色接近但 token 划分略有差别。 |

**尚未移植**

- **Waline 评论**：文章页底部的评论组件（原版 `src/components/waline/`）。
  主题已经预留了文章底部的位置；接入 Waline 只需在 `blog/single.html` 的 `bottom` 里
  加上官方脚本片段。
- **文档区 `/docs`**：原版有独立的左侧树形导航 + 右侧 TOC + 独立 RSS 的文档集合。
- **GitHub 活动图 / Substats 社交统计**：原版关于页的第三方卡片。
- **Pagefind 标签筛选 UI**：`data-pagefind-filter="tag"` 属性已输出，索引里也建好了
  filter，但还没做筛选交互。

---

## 重新生成样式

`assets/css/uno.css` 与 `chroma.css` 已提交，日常使用无需 Node。

如果修改了模板里的 class 名或新增短代码，需要用 UnoCSS 重新扫描生成。
本主题的源项目（演示站）提供了现成的工具链：

```bash
npm install
npm run css          # 重新生成 uno.css / chroma.css
```

或在你自己的站点中配置 UnoCSS 扫描 `themes/pure/layouts/`。

---

## 许可

Apache-2.0，见 [LICENSE](https://github.com/TajangSec/hugo-theme-pure/blob/main/LICENSE)。
主题与视觉设计源自 [astro-theme-pure](https://github.com/cworld1/astro-theme-pure)。
