# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-02-06

### Added

First stable release. Official plugin collection for Deno and Bun, compatible with the dweb framework.

#### CSS Plugins

- **TailwindCSS v4** (`@dreamer/plugins/tailwindcss`)
  - Auto compile, HMR, production optimization
  - PostCSS + @tailwindcss/postcss
  - Optional `content` param, `@source` directive in CSS
- **UnoCSS** (`@dreamer/plugins/unocss`)
  - Preset system, icons, fast build
  - @unocss/core + preset-wind
  - Build system integration with hashed output

#### i18n Plugin (`@dreamer/plugins/i18n`)

- Locale detection and switching
- Translation file management
- Route localization
- Date and number formatting
- Server global `$t` and `$i18n`
- Integrates with `@dreamer/i18n` for client

#### SEO Plugin (`@dreamer/plugins/seo`)

- Auto meta tags (title, description, keywords)
- Sitemap and Robots.txt generation
- Open Graph and Twitter Card
- Structured data (JSON-LD)
- `onBuildComplete` hook for build-time generation

#### PWA Plugin (`@dreamer/plugins/pwa`)

- Service Worker registration
- Web App Manifest generation
- Offline support
- Push notifications
- Theme color and mobile meta tags

#### Auth Plugin (`@dreamer/plugins/auth`)

- JWT authentication
- Bearer Token authentication
- Basic authentication
- Role and permission checks
- Public and protected path config
- `getUser`, `hasRole`, `hasPermission` methods

#### Security Plugins

- **Security** (`@dreamer/plugins/security`): CSP, HSTS, X-Frame-Options, Permissions-Policy
- **CORS** (`@dreamer/plugins/cors`): Cross-origin config, preflight, credentials
- **RateLimit** (`@dreamer/plugins/ratelimit`): Request rate limiting, skip paths, custom key generator

#### Other Plugins

- **Analytics** (`@dreamer/plugins/analytics`): Google Analytics 4, Universal Analytics, Plausible
- **Theme** (`@dreamer/plugins/theme`): Light/dark/system mode, class/attribute strategy
- **Compression** (`@dreamer/plugins/compression`): gzip, deflate response compression
- **Static** (`@dreamer/plugins/static`): Multi-directory, MIME types, ETag, cache control, path traversal protection
- **Social** (`@dreamer/plugins/social`): Share links (Twitter, Facebook, Weibo, LinkedIn, WeChat), OAuth (GitHub, Google)

#### Plugin System

- Event hooks: `onInit`, `onRequest`, `onResponse`, `onBuildComplete`
- Config validation via `validateConfig`
- Service registration to container
- Depends on `@dreamer/plugin` for lifecycle

#### Environment Compatibility

- Deno 2.5+
- Bun 1.0+
- Server: All plugins
- Client: Theme via `@dreamer/theme`, i18n via `@dreamer/i18n`

#### Testing

- 322 unit tests, all passing
- 15 plugins covered
- Config validation, hooks, services, edge cases
