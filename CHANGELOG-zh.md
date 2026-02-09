# 变更日志

本项目的所有重要变更均记录于此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)， 版本遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.4] - 2026-02-08

### 修复

- **Static**（`@dreamer/plugins/static`）：使用 runtime-adapter 的 `join()`
  构建文件路径，确保 Windows 路径兼容
- **TailwindCSS**（`@dreamer/plugins/tailwindcss`）：dev/prod CSS
  服务路径构建使用 `join()`，确保 Windows 兼容
- **UnoCSS**（`@dreamer/plugins/unocss`）：同上—路径构建使用 `join()`，确保
  Windows 兼容

---

## [1.0.3] - 2026-02-08

### Added

- **TailwindCSS**（`@dreamer/plugins/tailwindcss`）：onBuild 中推送 link 标签到
  `pluginBuildCssLinks`，供 dweb SSG 模板注入

### Changed

- **TailwindCSS**（`@dreamer/plugins/tailwindcss`）：生产环境 onResponse
  若检测到 link 已存在（如 SSG 模板已注入）则跳过，避免重复注入
- **UnoCSS**（`@dreamer/plugins/unocss`）：同上—SSG 通过 pluginBuildCssLinks
  注入 link，生产环境已注入时跳过

---

## [1.0.2] - 2026-02-08

### Added

- **UnoCSS**（`@dreamer/plugins/unocss`）：新增 `safelist` 配置项，用于动态
  class 名（如条件 badge 颜色）无法被静态提取时强制包含

### Fixed

- **UnoCSS**（`@dreamer/plugins/unocss`）：content glob 扫描现正确按 pattern
  目录扫描（如 `./src/backend/**/*.{ts,tsx}` 仅扫描 `src/backend/`
  而非项目根目录）

---

## [1.0.1] - 2026-02-07

### Added

- CHANGELOG-zh.md（中文变更日志）
- README.md 与 README-zh.md 中新增变更日志章节，链接至变更日志文件

### Changed

- **TailwindCSS**（`@dreamer/plugins/tailwindcss`）：开发模式改为注入 `<link>`
  而非 `<style>`，与生产模式一致，修复 Hybrid 模式下客户端导航后样式丢失
- **UnoCSS**（`@dreamer/plugins/unocss`）：同上，开发模式使用 `<link>` 避免
  Hybrid SPA 导航后样式丢失
- **依赖升级**：
  - `@dreamer/plugin`：^1.0.0-beta.6 → ^1.0.0
  - `@dreamer/service`：^1.0.0-beta.4 → ^1.0.0
  - `@dreamer/i18n`：^1.0.0-beta.4 → ^1.0.0

---

## [1.0.0] - 2026-02-06

### Added

首个稳定版本。适用于 Deno 和 Bun 的官方插件集合，与 dweb 框架兼容。

#### CSS 插件

- **TailwindCSS v4**（`@dreamer/plugins/tailwindcss`）
  - 自动编译、热重载、生产优化
  - PostCSS + @tailwindcss/postcss
  - 可选 `content` 参数，CSS 中支持 `@source` 指令
- **UnoCSS**（`@dreamer/plugins/unocss`）
  - 预设系统、图标、高效构建
  - @unocss/core + preset-wind
  - 构建系统集成带 hash 输出

#### i18n 插件（`@dreamer/plugins/i18n`）

- 语言检测与切换
- 翻译文件管理
- 路由本地化
- 日期与数字格式化
- 服务端全局 `$t` 和 `$i18n`
- 与 `@dreamer/i18n` 客户端集成

#### SEO 插件（`@dreamer/plugins/seo`）

- 自动 meta 标签（title、description、keywords）
- Sitemap 与 Robots.txt 生成
- Open Graph 与 Twitter Card
- 结构化数据（JSON-LD）
- `onBuildComplete` 钩子用于构建时生成

#### PWA 插件（`@dreamer/plugins/pwa`）

- Service Worker 注册
- Web App Manifest 生成
- 离线支持
- 推送通知
- 主题色与移动端 meta 标签

#### Auth 插件（`@dreamer/plugins/auth`）

- JWT 认证
- Bearer Token 认证
- Basic 认证
- 角色与权限校验
- 公开与受保护路径配置
- `getUser`、`hasRole`、`hasPermission` 方法

#### 安全插件

- **Security**（`@dreamer/plugins/security`）：CSP、HSTS、X-Frame-Options、Permissions-Policy
- **CORS**（`@dreamer/plugins/cors`）：跨域配置、预检、凭证
- **RateLimit**（`@dreamer/plugins/ratelimit`）：请求速率限制、跳过路径、自定义
  key 生成器

#### 其他插件

- **Analytics**（`@dreamer/plugins/analytics`）：Google Analytics 4、Universal
  Analytics、Plausible
- **Theme**（`@dreamer/plugins/theme`）：亮/暗/系统模式，class/attribute 策略
- **Compression**（`@dreamer/plugins/compression`）：gzip、deflate 响应压缩
- **Static**（`@dreamer/plugins/static`）：多目录、MIME
  类型、ETag、缓存控制、路径遍历防护
- **Social**（`@dreamer/plugins/social`）：分享链接（Twitter、Facebook、Weibo、LinkedIn、WeChat）、OAuth（GitHub、Google）

#### 插件系统

- 事件钩子：`onInit`、`onRequest`、`onResponse`、`onBuildComplete`
- 通过 `validateConfig` 进行配置校验
- 服务注册到容器
- 依赖 `@dreamer/plugin` 管理生命周期

#### 环境兼容

- Deno 2.5+
- Bun 1.0+
- 服务端：全部插件
- 客户端：Theme 通过 `@dreamer/theme`，i18n 通过 `@dreamer/i18n`

#### 测试

- 322 个单元测试，全部通过
- 覆盖 15 个插件
- 配置校验、钩子、服务、边界情况
