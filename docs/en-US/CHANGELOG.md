# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.1] - 2026-04-21

### Changed

- **JSR dependencies**: bump `@dreamer/theme` to stable `^1.0.1`,
  `@dreamer/auth` to `^1.0.1`, and `@dreamer/test` (dev) to `^1.1.8`.
- **`package.json`**: align `@dreamer/runtime-adapter` to `^1.0.18` and
  `postcss` to `8.5.10`.
- **`deno.json` imports**: PostCSS `^8.5.10`; Tailwind CSS /
  `@tailwindcss/postcss` `^4.1.18`; UnoCSS packages use caret semver ranges
  (`^66.0.0`).

---

## [1.1.0] - 2026-04-17

### Added

- **Queue plugin** (`@dreamer/plugins/queue`): `queuePlugin(options, logger?)`
  integrates `@dreamer/queue` `QueueManager` on `onStart`, registers the manager
  to the service container (`queueManager` or `queueManager:{name}`), creates
  queues with optional `process` handlers, and closes the manager on `onStop`.
  Second argument matches `APP_CONFIG.logger` (`LoggerConfig`) for dedicated log
  files and rotation, same pattern as `scheduledPlugin`.
- **`plugins/src/internal/plugin-logger.ts`**: shared `buildPluginTaskLogger`
  for scheduled and queue plugins (child logger merge or standalone
  `createLogger`).
- **`package.json` exports**: added `./queue` subpath for npm consumers.

### Changed

- **Scheduled plugin**: refactored to use shared plugin logger helper (behavior
  unchanged).

---

## [1.0.9] - 2026-03-12

### Added

- **UnoCSS presets as instances**: `unocssPlugin` `presets` option now accepts
  preset instances (objects) in addition to module-name strings. Use
  `@unocss/preset-wind4` and `unocss-preset-daisy` (e.g.
  ameinhardt/unocss-preset-daisy) by importing and passing instances in
  `main.ts`: `presets: [presetWind4(), presetDaisy()]`.
- **UnoCSSPresetItem type**: Exported from `@dreamer/plugins` and
  `@dreamer/plugins/unocss` for typing preset arrays.
- **Tests**: Unit tests for preset-instance config validation and for
  plugin/compiler using preset instances (README presetWind4/presetDaisy flow).

### Changed

- **UnoCSS compiler**: Resolves only known preset strings (wind3/wind); custom
  presets (wind4, daisy) must be passed as instances. Default preset remains
  wind3 when no presets are provided.

---

## [1.0.8] - 2026-02-25

### Added

- **Main module exports**: All plugins are now re-exported from the main entry
  `@dreamer/plugins`. Compression, CORS, ratelimit, security, auth, static, and
  social plugins (and their option types) can be imported from the package root
  in addition to subpaths like `@dreamer/plugins/compression`.

### Changed

- **PostCSS**: Pinned `postcss` to `8.5.6` in imports to align with
  `@tailwindcss/postcss` dependency and fix type-check conflict.

---

## [1.0.7] - 2026-02-24

### Added

- **Static plugin** (`@dreamer/plugins/static`): Prefix `"/*"` matches all
  routes. When prefix is `"/*"` and the request path has no file extension (pure
  SPA route), the plugin serves `index.html` from the configured root so
  client-side routing can handle the path. Paths with an extension are served as
  static files only; no fallback to index.

### Changed

- **Static plugin**: `StaticDirectory.prefix` supports `"/*"`; JSDoc documents
  that `"/*"` means match-all and pure routes return index.

---

## [1.0.6] - 2026-02-19

### Added

- **Package i18n** (`src/i18n.ts`): Server-side messages for social
  (OAuth/share), ratelimit, auth, and static in en-US and zh-CN. Locale from
  `LANGUAGE` / `LC_ALL` / `LANG`. Export `$tr`, `setPluginsLocale`,
  `detectLocale`, `Locale`, `DEFAULT_LOCALE`. Locales in
  `src/locales/en-US.json` and `src/locales/zh-CN.json`.

### Changed

- **Social plugin**: OAuth and share error messages use
  `$tr("plugins.social.*")`.
- **Ratelimit plugin**: Default rate-limit message uses
  `$tr("plugins.ratelimit.defaultMessage")`.
- **Auth plugin**: Default unauthorized/forbidden messages use
  `$tr("plugins.auth.*")`.
- **Static plugin**: 403 response body uses `$tr("plugins.static.forbidden")`.

---

## [1.0.5] - 2026-02-19

### Added

- **Documentation**: Reorganized docs into `docs/zh-CN` and `docs/en-US` (same
  structure as @dreamer/render). Chinese README, CHANGELOG, and TEST_REPORT in
  `docs/zh-CN`; English CHANGELOG and TEST_REPORT in `docs/en-US` with full
  translation.

### Changed

- **README**: Root README and doc links now point to `docs/zh-CN/README.md`,
  `docs/en-US/TEST_REPORT.md`, and `docs/en-US/CHANGELOG.md`. Removed references
  to obsolete root-level duplicate docs.
- **Global $t / $i18n**: Replaced broken link to non-existent
  `src/i18n/global.d.ts` with wording that refers to adding a global type
  declaration file (e.g. `global.d.ts`) in the project, in both root README and
  `docs/zh-CN/README.md`.

---

## [1.0.4] - 2026-02-08

### Fixed

- **Static** (`@dreamer/plugins/static`): Use `join()` from runtime-adapter for
  file path construction to ensure Windows path compatibility
- **TailwindCSS** (`@dreamer/plugins/tailwindcss`): Use `join()` for path
  construction in dev/prod CSS serving for Windows compatibility
- **UnoCSS** (`@dreamer/plugins/unocss`): Same as TailwindCSS—use `join()` for
  path construction for Windows compatibility

---

## [1.0.3] - 2026-02-08

### Added

- **TailwindCSS** (`@dreamer/plugins/tailwindcss`): Push link tags to
  `pluginBuildCssLinks` in onBuild for dweb SSG template injection

### Changed

- **TailwindCSS** (`@dreamer/plugins/tailwindcss`): Production onResponse skips
  injection if CSS link already present (e.g. from SSG template) to avoid
  duplicate
- **UnoCSS** (`@dreamer/plugins/unocss`): Same changes as TailwindCSS—SSG link
  injection via pluginBuildCssLinks, production skip when already injected

---

## [1.0.2] - 2026-02-08

### Added

- **UnoCSS** (`@dreamer/plugins/unocss`): `safelist` option for dynamic class
  names (e.g. conditional badge colors) that cannot be extracted statically

### Fixed

- **UnoCSS** (`@dreamer/plugins/unocss`): Content glob scanning now respects
  pattern directory (e.g. `./src/backend/**/*.{ts,tsx}` scans only
  `src/backend/` instead of project root)

---

## [1.0.1] - 2026-02-07

### Added

- CHANGELOG-zh.md (Chinese changelog)
- Changelog section in README.md and README-zh.md linking to changelog files

### Changed

- **TailwindCSS** (`@dreamer/plugins/tailwindcss`): Dev mode now injects
  `<link>` instead of `<style>` for consistency with production, fixing style
  loss after client-side navigation in Hybrid mode
- **UnoCSS** (`@dreamer/plugins/unocss`): Same change as TailwindCSS—dev mode
  uses `<link>` to avoid style loss in Hybrid SPA navigation
- **Dependencies**:
  - `@dreamer/plugin`: ^1.0.0-beta.6 → ^1.0.0
  - `@dreamer/service`: ^1.0.0-beta.4 → ^1.0.0
  - `@dreamer/i18n`: ^1.0.0-beta.4 → ^1.0.0

---

## [1.0.0] - 2026-02-06

### Added

First stable release. Official plugin collection for Deno and Bun, compatible
with the dweb framework.

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

- **Security** (`@dreamer/plugins/security`): CSP, HSTS, X-Frame-Options,
  Permissions-Policy
- **CORS** (`@dreamer/plugins/cors`): Cross-origin config, preflight,
  credentials
- **RateLimit** (`@dreamer/plugins/ratelimit`): Request rate limiting, skip
  paths, custom key generator

#### Other Plugins

- **Analytics** (`@dreamer/plugins/analytics`): Google Analytics 4, Universal
  Analytics, Plausible
- **Theme** (`@dreamer/plugins/theme`): Light/dark/system mode, class/attribute
  strategy
- **Compression** (`@dreamer/plugins/compression`): gzip, deflate response
  compression
- **Static** (`@dreamer/plugins/static`): Multi-directory, MIME types, ETag,
  cache control, path traversal protection
- **Social** (`@dreamer/plugins/social`): Share links (Twitter, Facebook, Weibo,
  LinkedIn, WeChat), OAuth (GitHub, Google)

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
