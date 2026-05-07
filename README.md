# Volantis 6.0.0-alpha

Fork 版本 Volantis Hexo 主题，深度定制。基于原主题重构，剥离了 CDN 解析引擎、未使用的模块和覆盖层，优化了暗色模式、阅读模式、打印模式等功能。

## 目录结构

```text
volantis/
├── _config.yml                 # 主题默认配置
├── languages/                  # 多语言 (en, zh-CN, zh-TW)
├── layout/                     # EJS 模板
│   ├── layout.ejs              # 主模板壳
│   ├── index/post/page/...     # 页面模板
│   ├── _meta/                  # 文章元数据组件 (10 个)
│   ├── _partial/               # 页面部件 (head/header/footer/article/...)
│   │   └── scripts/            # 脚本加载器
│   ├── _plugins/               # 功能插件模板
│   └── _widget/                # 侧边栏小组件 (19 个)
├── scripts/                    # Hexo 脚本
│   ├── events/                 # generateBefore 钩子 (配置合并、Stylus 渲染)
│   ├── filters/                # 渲染过滤器 (图片处理、Feather 图标、全局替换)
│   ├── helpers/                # 模板辅助函数 (SEO、自定义注入)
│   └── tags/                   # 标签插件 (25 个)
└── source/                     # 前端资源
    ├── css/                    # Stylus 样式
    │   ├── style.styl          # 样式入口
    │   ├── read.styl           # 阅读模式
    │   ├── print.styl          # 打印模式
    │   ├── _defines/           # 变量/mixin (7 文件)
    │   └── _style/             # 组件样式
    │       ├── _base/          # 全局基础样式
    │       ├── _layout/        # 布局组件 (15 文件)
    │       ├── _plugins/       # 插件样式 (暗色/搜索/高亮/评论)
    │       └── _tag-plugins/   # 标签插件样式 (11 文件)
    └── js/                     # JavaScript
        ├── global.js           # 全局基础 (<head> 同步加载)
        ├── app.js              # 主应用逻辑
        ├── plugins/            # 右键菜单、标签 API 加载器
        ├── search/             # 搜索服务 (hexo/algolia/meilisearch)
        └── szyink/             # 第三方库 (fancybox/pjax/lazyload/iconfont)
```

## 功能模块

### 导航栏

固定顶部导航，支持自动隐藏/常显（`navbar.visiable`），Logo 支持图片/图标/文字三种模式，多级下拉菜单、移动端汉堡菜单，内置搜索入口。

### 文章系统

文章预览卡片（封面图、摘要、元数据行），上下篇导航、推荐阅读，版权声明（6 种自定义类型），文章元数据可配置（`top_meta` / `bottom_meta` 数组），支持 HTTP 451 法律限制页面，外链安全跳转。

### 侧边栏

19 种小组件，支持 sticky 和桌面/移动端区分。文章目录（TOC）自动从内容提取，6 级缩进。博主信息、分类、标签云、站点统计、最近更新等。

### 评论系统

- **Artalk**：自部署，支持暗色模式同步、图片上传、评论计数
- **Disqus**：国际站方案，支持自动加载和 SPA 刷新

### 搜索

- **Hexo 搜索**：本地 JSON 全文搜索，支持筛选、搜索历史
- **Algolia**：基于 instantsearch.js
- **MeiliSearch**：基于 instant-meilisearch

### 暗色模式

CSS 变量驱动（`color-scheme` 属性），localStorage 持久化 + 系统偏好检测，`darkModeChanged` 自定义事件通知各组件同步。

### 阅读模式

隐藏侧边栏、导航栏、评论区，正文居中 860px，独立样式表 `read.styl`，带入场/退场动画，右键菜单和 `_meta` 按钮均可触发。

### 打印模式

隐藏非内容元素，设置 A4 宽度，自动加载所有懒加载图片后触发 `window.print()`。

### 右键菜单

完全可配置的自定义右键菜单，条件显示（选中文本、在链接上、在图片上、文章页面等），内置操作：滚动、复制、跳转文章、阅读模式、打印等。

### 代码高亮

支持 **highlight.js** 和 **PrismJS** 两种引擎，代码块复制按钮，25+ 语言标签徽章。

### SEO

Schema.org 结构化数据（Article、Person、Organization、ImageGallery），Open Graph / Twitter Card 元标签，自动生成 canonical URL、robots meta，关键词和描述自动生成。

### Pjax SPA 导航

全站 SPA 体验，脚本通过 `volantis.pjax.push()` 注册重载回调，NProgress 加载条（可选）。

### 标签插件（25 个）

| 标签 | 说明 |
| --- | --- |
| `{% btn %}` | 按钮链接 |
| `{% btns %}` / `{% cell %}` | 按钮组 |
| `{% checkbox %}` / `{% radio %}` | 复选框/单选框 |
| `{% contributors %}` | GitHub 贡献者列表 |
| `{% menu %}` / `{% submenu %}` / `{% menuitem %}` | 下拉菜单 |
| `{% gallery %}` | FancyBox 图片画廊 |
| `{% folding %}` | 折叠详情 |
| `{% frame %}` | 设备模型框 |
| `{% friends %}` | 友链卡片 |
| `{% ghcard %}` / `{% ghcardgroup %}` | GitHub 统计卡片 |
| `{% iconfont %}` / `{% emoji %}` | 图标 |
| `{% image %}` / `{% inlineimage %}` | 图片 |
| `{% u %}` `{% emp %}` `{% wavy %}` `{% del %}` `{% kbd %}` `{% psw %}` `{% b %}` | 行内文本装饰 |
| `{% link %}` / `{% linkgroup %}` | 链接卡片 |
| `{% md %}` | 远程 Markdown 渲染 |
| `{% audio %}` / `{% video %}` / `{% videos %}` | 音视频（含 HLS m3u8） |
| `{% note %}` / `{% blocknote %}` | 注释/提示块 |
| `{% pandown %}` | 百度网盘下载嵌入 |
| `{% sites %}` | 站点卡片 |
| `{% p %}` / `{% span %}` / `{% bb %}` | 段落/行内样式 |
| `{% swiper %}` | Swiper 图片轮播 |
| `{% table %}` | 表格包裹 |
| `{% tabs %}` / `{% subtabs %}` / `{% subsubtabs %}` | 标签页 |
| `{% timeline %}` / `{% timenode %}` | 时间线 |
| `{% timelines %}` / `{% timenodes %}` | 图标时间线 |

## 配置项参考

完整配置项定义在 `_config.yml`（约 817 行），按功能分为以下段落：

### `info`

主题元信息：`theme_name`、`theme_docs`、`theme_repo`

### `default`

占位图默认值：`avatar`、`link`、`cover`、`image`

### `cdn`

资源 URL 映射。核心资源走本地路径，第三方库走 CDN：

- 内部：`volantis_style`、`volantis_app`、`volantis_rightMenus`、`volantis_search_*`
- 第三方：`fancybox_css`/`fancybox_js`、`algolia_search_v4`、`instantsearch_v4`、`instant_meilisearch`、`markdown`、`marked`、`hlsjs`、`iconfontInkss`

### `replace`

全局字符串替换规则（正则），用于 CDN 域名替换

### `dns_prefetch`

DNS 预解析域名数组

### `scroll_smooth`

布尔值，启用平滑滚动

### `navbar`

- `enable` — 启用导航栏
- `visiable` — `auto`（滚动隐藏）/ `always`（常显）
- `logo` — `{img, icon, title}` Logo 配置
- `menu` — 菜单数组 `[{name, icon, url}]`
- `search` — 搜索框占位符

### `pages`

- `friends.layout_scheme` — `traditional`  友链布局

### `article`

**preview** — 预览卡片配置：

- `scheme`、`pin_icon`、`auto_title`、`auto_excerpt`、`hide_excerpt`
- `line_style`（solid/dashed/dotted）、`author`、`readmore`

**body** — 文章正文配置：

- `top_meta` / `bottom_meta` — 元数据数组，可选值：`author`、`date`、`updated`、`category`、`counter`、`tags`、`wordcount`、`readmode`、`printmode`、`artalkcount`
- `footer_widget` — 文章底部组件（`references`、`copyright` 含自定义规则、`donate`）
- `meta_library` — 各元数据的详细配置

### `comments`

- `service` — `artalk` / `disqus`
- **artalk**：`server`、`css`、`js`、`path`、`placeholder`、`visitor`、`imageUploader`
- **disqus**：`shortname`、`autoload`、`path`

### `sidebar`

- `position` — `left` / `right`
- `for_page` — 页面侧边栏组件数组
- `for_post` — 文章侧边栏组件数组（默认 `[toc]`）

**widget_library** — 各组件配置：

- `blogger`：头像、标题、副标题、诗词、社交链接
- `toc`：sticky、header、list_number、depth
- `category`、`tagcloud`（min/max font、color）
- `qrcode`、`webinfo`（文章数、运行时间、字数、访问量、最后更新）
- `lastupdate`、`artalk`、`nextsite`

### `tag_plugins`

- `note`：图标、颜色、iconfont、feather
- `checkbox`：交互性、颜色
- `link`：占位图

### `site_footer`

- `layout` — 布局顺序 `[social, license, info, copyright]`
- `social` — 社交链接数组
- `source` — 源码链接
- `analytics` — 统计代码 HTML（如不蒜子）
- `copyright` — 版权声明 Markdown

### `plugins`

- `fontawesome` — 启用 + CSS CDN
- `busuanzi` — 不蒜子访问统计
- `code_highlight` — `highlightjs` / `prismjs`
- `pjax` — 启用 + 配置（timeout、cacheBust、exclude）
- `nprogress` — 加载进度条
- `darkmode` — 暗色模式开关

### `rightmenus`

右键菜单完整配置：

- `options`：`navigation`（导航栏）、`maxMenuItems`
- `navigation`：导航栏按钮数组
- `menuList`：菜单项数组，每项含 `name`、`icon`、`click`（事件名）、`displayCondition`（显示条件）

### `search`

- `enable` — 启用搜索
- `service` — `hexo` / `algolia` / `meilisearch`

### `color_scheme`

- **common**：`theme`、`link`、`button`、`hover`、`inner`、`selection`
- **light** / **dark**：`site_bg`、`card`、`text`、`block`、`codeblock`、`inlinecode`、`h1-h6`、`p`、`list`、`list_hl`、`meta`、`copyright_bkg` 等

### `custom_css`

- `font_smoothing` — 字体平滑
- `max_width` — 最大宽度（默认 1080px）
- `scrollbar` — 滚动条样式（size、border）
- `navbar` — 导航栏高度、宽度模式（auto/full）、效果
- `sidebar` — 侧边栏效果
- `body` — 页面效果、高亮、文字对齐
- `gap` — 间距系统（base、h2-h4、p、line_height）
- `border_radius` — 圆角（card、codeblock、searchbar、button）
- `fontsize` — 字号系统（root、h1-h6、list、meta、code、footnote）
- `fontfamily` — 字体（logofont、bodyfont、codefont 含 CDN URL）

### `seo`

- `use_tags_as_keywords` — 标签作为关键词
- `use_excerpt_as_description` — 摘要作为描述
- `robots` — 各页面的 robots 规则（home_first_page、home_other_pages、archive、category、tag）

### `open_graph`

- `image`、`twitter_card`、`path`、`width`、`height`

### `icon`

- `page_prev`、`page_next`、`top`、`load`

## 内部 JS 公共 API

### `window.volantis`（global.js）

全局命名空间，在 `<head>` 同步加载，所有其他脚本依赖此对象。

| 属性/方法 | 说明 |
| --- | --- |
| `volantis.dom.$(ele)` | DOM 包装器工厂，返回 `VolantisDom` 实例 |
| `volantis.dom.bodyAnchor` | `#safearea` DOM 引用 |
| `volantis.dom.topBtn` | `#s-top` 回到顶部按钮 |
| `volantis.dom.wrapper` | `#wrapper` 整个导航栏 |
| `volantis.dom.switcher` | 搜索按钮 |
| `volantis.dom.header` | `#l_header` 导航栏 |
| `volantis.dom.search` | 搜索框 |
| `volantis.dom.mPhoneList` | 移动端子菜单 |
| `volantis.EventListener.list` | 事件监听器数组 |
| `volantis.EventListener.remove()` | 清除所有注册的监听器（pjax 切换时调用） |
| `volantis.pjax.push(cb, name)` | 注册 pjax:complete 回调 |
| `volantis.pjax.send(cb, name)` | 注册 pjax:send 回调 |
| `volantis.pjax.error(cb, name)` | 注册 pjax:error 回调 |
| `volantis.dark.mode` | 当前暗色模式 `dark` / `light` |
| `volantis.dark.toggle()` | 切换暗色模式 |
| `volantis.dark.push(cb, name)` | 注册暗色模式切换回调 |
| `volantis.js(src, cb)` | 动态加载脚本，返回 Promise。cb 可为函数或属性对象 |
| `volantis.css(src)` | 动态加载 CSS，返回 Promise |
| `volantis.requestAnimationFrame(fn)` | RAF 兼容封装 |
| `volantis.layoutHelper(helper, html, opt)` | 向布局注入 HTML，支持 pjax 持久化 |
| `volantis.scroll.push(cb, name)` | 注册滚动回调 |
| `volantis.scroll.getScrollTop()` | 获取滚动位置 |
| `volantis.scroll.scrollHeight()` | 页面总高度 |
| `volantis.scroll.offsetHeight()` | 可视区域高度 |
| `volantis.scroll.progress()` | 滚动进度 0~1 |
| `volantis.scroll.to(ele, option)` | 平滑滚动到元素 |

### `VolantisApp`（app.js）

主应用逻辑，Object.freeze 冻结。

| 方法 | 说明 |
| --- | --- |
| `VolantisApp.init()` | 初始化 resize handler、滚动回调、location hash |
| `VolantisApp.subscribe()` | 完整页面初始化（导航栏、菜单、搜索、TOC、标签页、脚注、时间显示） |
| `VolantisApp.pjaxReload()` | pjax 切换后重新初始化 |
| `VolantisApp.utilCopyCode(selector)` | 为代码块添加复制按钮 |
| `VolantisApp.utilWriteClipText(str)` | 写入剪贴板（含降级） |
| `VolantisApp.utilTimeAgo(date, limit)` | 时间转为"多久前"格式 |
| `VolantisApp.scrolltoElement(elem, correction)` | 滚动到元素（补偿导航栏高度） |

### `volantis.readmode`（app.js）

阅读模式控制。

| 方法 | 说明 |
| --- | --- |
| `volantis.readmode.toggle()` | 切换阅读模式 |
| `volantis.readmode.exit()` | 强制退出阅读模式 |

### `volantis.printmode`（app.js）

打印模式控制。

| 方法 | 说明 |
| --- | --- |
| `volantis.printmode.print()` | 加载所有懒加载图片并触发 `window.print()` |

### `highlightKeyWords`（app.js）

URL 关键词高亮，与搜索功能搭配。

| 方法 | 说明 |
| --- | --- |
| `highlightKeyWords.start(keywords, querySelector)` | TreeWalker 文本高亮 |
| `highlightKeyWords.startFromURL()` | 从 URL `?keyword=` 参数读取关键词 |
| `highlightKeyWords.scrollToNextHighlightKeywordMark(id)` | 跳转到下一个高亮标记 |
| `highlightKeyWords.scrollToPrevHighlightKeywordMark(id)` | 跳转到上一个高亮标记 |
| `highlightKeyWords.cleanHighlightStyle()` | 清除所有高亮 |

### `VolantisFancyBox`（app.js）

FancyBox v5 封装，按需加载。

| 方法 | 说明 |
| --- | --- |
| `new VolantisFancyBox()` | 创建实例，配置选项 |
| `.bind(selectors)` | 绑定 FancyBox 到选择器 |
| `.groupBind(selectors, groupName)` | 分组画廊绑定 |
| `.loadFancybox()` | 懒加载 FancyBox CSS/JS |

### `LazyLoader`（app.js）

IntersectionObserver 图片懒加载。

| 方法 | 说明 |
| --- | --- |
| `new LazyLoader(selector)` | 创建观察器 |
| `.observeElements()` | 开始观察所有 `.lazy` 元素 |
| `.loadImage(lazyImage)` | 加载单张图片 |
| `.reinitObserver()` | 滚动停止后重新初始化 |

### `SearchService`（search/*.js）

搜索服务单例，根据配置加载对应实现。

| 方法 | 说明 |
| --- | --- |
| `SearchService.init()` | 初始化搜索 |
| `SearchService.setQueryText(q)` | 设置搜索关键词 |
| `SearchService.search()` | 打开搜索面板并执行搜索 |

### `contextMenuManager`（rightMenus.js）

右键菜单管理。

| 方法 | 说明 |
| --- | --- |
| `contextMenuManager.initializeContextMenu()` | 初始化右键菜单 |
| `contextMenuManager.generateMenuHTML()` | 生成菜单 DOM |

### 全局函数

| 函数 | 说明 |
| --- | --- |
| `errorImgAvatar(img)` | 头像图片加载失败降级 |
| `errorImgCover(img)` | 封面图片加载失败降级 |

## 自定义事件

| 事件 | 触发时机 | 监听者 |
| --- | --- | --- |
| `pjax:send` | Pjax 开始导航 | 关闭搜索、右键菜单、阅读模式 |
| `pjax:complete` | Pjax 导航完成 | 重新初始化所有组件 |
| `pjax:success` | Pjax 成功 | 内部使用 |
| `pjax:error` | Pjax 出错 | 错误处理 |
| `darkModeChanged` | 暗色模式切换 | 搜索组件同步、Artalk 同步 |
| `LazyLoad::Initialized` | LazyLoad 初始化完成 | 内部使用 |

## 自定义注入系统

灵感来自 NexT 主题，通过 `scripts/helpers/custom-files.js` 实现。

### 样式注入（4 个点）

| 注入点 | 说明 |
| --- | --- |
| `first` | 最先加载的样式 |
| `style` | 主样式之后 |
| `dark` | 暗色模式样式 |
| `darkVar` | 暗色模式变量 |

### 视图注入（10 个点）

| 注入点 | 说明 |
| --- | --- |
| `headBegin` | `<head>` 开始 |
| `headEnd` | `<head>` 结束 |
| `header` | 导航栏 |
| `side` | 侧边栏 |
| `topMeta` | 文章顶部元数据 |
| `bottomMeta` | 文章底部元数据 |
| `footer` | 页脚 |
| `postEnd` | 文章末尾 |
| `bodyBegin` | `<body>` 开始 |
| `bodyEnd` | `<body>` 结束 |

默认从 `source/_volantis/` 目录读取文件，可通过 `custom_files` 配置自定义路径。

## 样式系统

### Stylus 结构

```
style.styl
  → _defines/       # 变量、mixin、动画
  → _style/
      _base/        # 全局重置、CSS 变量
      _layout/      # 布局组件
      _plugins/     # 插件样式（暗色/搜索/高亮/评论/右键菜单）
      _tag-plugins/ # 标签插件样式
  → injects         # 用户注入样式
```

### CSS 自定义属性

主题通过 `:root` 设置 30+ CSS 变量，暗色模式通过 `[color-scheme='dark']` 覆盖：

```css
--color-site-body, --color-site-bg, --color-site-inner
--color-card, --color-text, --color-block
--color-codeblock, --color-inlinecode
--color-h1 ~ --color-h6, --color-p
--color-list, --color-list-hl, --color-meta
--color-read-bkg, --color-read-post
```

### 暗色模式机制

1. `darkmode/script.ejs` 在 `<html>` 上设置 `color-scheme` 属性
2. `dark_async.styl` 通过 `@media (prefers-color-scheme: dark)` 和 `[color-scheme='dark']` 覆盖 CSS 变量
3. `dark_plugins.styl` 强制覆盖第三方组件的亮色样式
4. localStorage 持久化用户选择，支持跟随系统偏好

### 响应式断点

| 变量 | 宽度 |
| --- | --- |
| `$device-mobile-s` | 320px |
| `$device-mobile` | 680px |
| `$device-tablet` | 768px |
| `$device-desktop` | 1080px |
| `$device-4k` | 2560px |

## 脚本加载顺序

1. `global.js` — `<head>` 同步加载
2. `app.js` — `<%- js() %>` 同步加载
3. `rightMenus.js` — `async` 加载
4. 暗色模式脚本
5. 评论系统脚本（按需）
6. 搜索服务脚本（按需）
7. 代码高亮脚本
8. Pjax / NProgress
9. 不蒜子 / iconfont（按需 `volantis.js()`）

## 许可证

[MIT](LICENSE) — Copyright 2017 xaoxuu
