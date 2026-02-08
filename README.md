# @dreamer/plugins

> Official plugin collection for Deno and Bun: CSS utilities, i18n, SEO, PWA, auth, and more

English | [中文 (Chinese)](./README-zh.md)

[![JSR](https://jsr.io/badges/@dreamer/plugins)](https://jsr.io/@dreamer/plugins)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/tests-322%20passed-brightgreen)](./TEST_REPORT.md)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.1-38bdf8)](https://tailwindcss.com)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-v66+-333)](https://unocss.dev)

---

## 🎯 Features

Official plugin collection for the dweb framework. Depends on `@dreamer/plugin` for lifecycle management.

---

## 📦 Installation

### Deno

```bash
deno add jsr:@dreamer/plugins
```

### Bun

```bash
bunx jsr add @dreamer/plugins
```

---

## 🌍 Environment Compatibility

| Environment | Version | Status |
|-------------|---------|--------|
| **Deno** | 2.5+ | ✅ Full support |
| **Bun** | 1.0+ | ✅ Full support |
| **Server** | - | ✅ Deno/Bun compatible |
| **Client** | - | ✅ Theme: @dreamer/theme, i18n: @dreamer/i18n |
| **Dependencies** | `@dreamer/plugin` | 📦 Required |

---

## ✨ Characteristics

### CSS Plugins
- **TailwindCSS v4**: Auto compile, HMR, production optimization (PostCSS + @tailwindcss/postcss)
- **UnoCSS**: Presets, icons, fast build (@unocss/core + preset-wind)
- **Config**: `content` optional; TailwindCSS v4 recommends `@source` in CSS

### i18n Plugin
- Locale detection and switching
- Translation file management
- Route localization
- Date and number formatting
- **Server $t**: Use `$t()` on server
- **Client module**: Browser translation functions

### SEO Plugin
- Auto meta tags
- Sitemap and Robots.txt
- Open Graph and Twitter Card
- Structured data (JSON-LD)

### PWA Plugin
- Service Worker registration
- Web App Manifest
- Offline support
- Push notifications

### Auth Plugin
- JWT, Bearer Token, Basic auth
- Role and permission checks
- Public path config

### Security Plugins
- **Security**: CSP, HSTS, X-Frame-Options, etc.
- **CORS**: Cross-origin config
- **RateLimit**: Request rate limiting

### Other Plugins
- **Analytics**: Google Analytics, Plausible
- **Theme**: Light/dark/system mode
- **Compression**: gzip, deflate
- **Static**: Multi-dir, MIME, ETag, cache, security
- **Social**: Share links and OAuth

---

## 🎯 Use Cases

- **Modern CSS**: TailwindCSS or UnoCSS
- **i18n**: Multi-language apps
- **SEO**: Search ranking and social sharing
- **PWA**: Installable progressive web apps
- **Security**: Headers, CORS, rate limiting
- **Auth**: JWT, Bearer Token, Basic Auth

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { PluginManager } from "@dreamer/plugin";
import { ServiceContainer } from "@dreamer/service";
import { tailwindPlugin, i18nPlugin, seoPlugin, themePlugin } from "@dreamer/plugins";

// Create service container and plugin manager
const container = new ServiceContainer();
const pluginManager = new PluginManager(container);

// Add plugins
// TailwindCSS v4: content optional, prefer @source in CSS
await pluginManager.use(tailwindPlugin({
  cssEntry: "./src/assets/tailwind.css",
}));

await pluginManager.use(i18nPlugin({
  locales: ["zh-CN", "en-US"],
}));

await pluginManager.use(seoPlugin({
  title: "My App",
  description: "A great application",
}));

await pluginManager.use(themePlugin({
  defaultMode: "system",
  strategy: "class",
  darkClass: "dark",
}));

// Trigger init
await pluginManager.triggerInit();
```

### dweb Integration

```typescript
import { App } from "@dreamer/dweb";
import {
  tailwindPlugin,
  pwaPlugin,
  analyticsPlugin,
  themePlugin,
  authPlugin,
  securityPlugin,
  corsPlugin,
} from "@dreamer/plugins";

const app = new App({
  plugins: [
    // TailwindCSS v4 (content optional, prefer @source in CSS)
    tailwindPlugin({
      cssEntry: "./src/assets/tailwind.css",
    }),

    // PWA
    pwaPlugin({
      name: "My App",
      themeColor: "#3498db",
      offlineSupport: true,
    }),

    // Google Analytics
    analyticsPlugin({
      ga4Id: "G-XXXXXXXXXX",
      trackPageviews: true,
    }),

    // Theme
    themePlugin({
      defaultMode: "system",
    }),

    // Auth
    authPlugin({
      type: "jwt",
      jwt: { secret: "your-secret-key" },
      protectedPaths: ["/api/"],
      publicPaths: ["/api/auth/login"],
    }),

    // Security headers
    securityPlugin({
      hsts: { maxAge: 31536000 },
      csp: { defaultSrc: ["'self'"] },
    }),

    // CORS
    corsPlugin({
      origin: ["https://example.com"],
      credentials: true,
    }),
  ],
});

await app.start();
```

---

## 🎨 Examples

### TailwindCSS v4 Plugin

```typescript
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// Basic (recommend @source in CSS)
const plugin = tailwindPlugin({
  cssEntry: "./src/assets/tailwind.css",
});

// Full config
const plugin = tailwindPlugin({
  cssEntry: "./src/assets/tailwind.css",
  content: ["./src/**/*.{ts,tsx}"], // Optional, prefer @source
  config: "./tailwind.config.ts",   // Optional
  assetsPath: "/assets",            // Static asset URL (default "/assets")
  jit: true,                        // Default on
  darkMode: "class",                // Dark mode strategy
});
```

**CSS entry (tailwind.css):**

```css
/* TailwindCSS v4 uses @source for scan paths */
@source "../**/*.{ts,tsx}";

@import "tailwindcss";

/* Custom styles */
.custom-class {
  @apply bg-blue-500 text-white;
}
```

### UnoCSS Plugin

```typescript
import { unocssPlugin } from "@dreamer/plugins/unocss";

// Basic
const plugin = unocssPlugin({
  cssEntry: "./src/assets/unocss.css",
  content: ["./src/**/*.{ts,tsx}"],
});

// Full config
const plugin = unocssPlugin({
  cssEntry: "./src/assets/unocss.css",
  content: ["./src/**/*.{ts,tsx}"],
  assetsPath: "/assets",              // Static asset URL (default "/assets")
  presets: ["@unocss/preset-wind"],   // TailwindCSS compatible
  icons: true,                        // Enable icons
  shortcuts: {
    "btn": "px-4 py-2 rounded bg-blue-500 text-white",
  },
});
```

### Auth Plugin

```typescript
import { authPlugin } from "@dreamer/plugins/auth";

const plugin = authPlugin({
  type: "jwt",
  jwt: {
    secret: "your-jwt-secret",
    expiresIn: 3600 * 24 * 7, // 7 days
  },
  protectedPaths: ["/api/", "/admin/"],
  publicPaths: ["/api/login", "/api/register"],
  roles: {
    "/admin/": ["admin"],
    "/api/users/": ["admin", "moderator"],
  },
});

// Get user in handler
const authService = container.get("authService");
const user = authService.getUser(context);
if (authService.hasRole(user, "admin")) {
  // Admin action
}
```

### i18n Plugin

```typescript
import { i18nPlugin, $t, $i18n } from "@dreamer/plugins/i18n";

const plugin = i18nPlugin({
  defaultLocale: "zh-CN",
  locales: ["zh-CN", "en-US", "ja-JP"],
  detectLanguage: true,
  detectMethods: ["header", "cookie", "query"],
});

await pluginManager.use(plugin);
await pluginManager.triggerInit();

// Load translations
$i18n.loadTranslations("zh-CN", {
  hello: "Hello",
  welcome: "Welcome {name}",
  menu: {
    home: "Home",
    about: "About",
  },
});

// Use $t
console.log($t("hello")); // "Hello"
console.log($t("welcome", { name: "John" })); // "Welcome John"
console.log($t("menu.home")); // "Home"

// Use $i18n
$i18n.setLocale("en-US");
console.log($i18n.getLocale()); // "en-US"
```

#### Global $t type declaration (optional)

To use `$t` and `$i18n` without import, copy [`src/i18n/global.d.ts`](./src/i18n/global.d.ts) to your project and reference in `deno.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["./global.d.ts"]
  }
}
```

Or add triple-slash reference at file top:

```typescript
/// <reference path="./global.d.ts" />

// Then use directly without import
const text = $t("hello");
$i18n.setLocale("en-US");
```

### Static File Plugin

```typescript
import { staticPlugin } from "@dreamer/plugins/static";

// Basic (default root: "assets", prefix: "/assets")
const plugin = staticPlugin();

// Single directory
const plugin = staticPlugin({
  root: "./public",
  prefix: "/static",
  index: ["index.html"],
  etag: true,
  cacheControl: "public, max-age=31536000, immutable", // Production cache
  // Dev auto uses "no-cache, no-store, must-revalidate"
  mimeTypes: {
    ".wasm": "application/wasm",
  },
});

// Multi-directory (serve multiple static dirs)
const plugin = staticPlugin({
  statics: [
    { root: "./assets", prefix: "/assets" },
    { root: "./dist/client/assets", prefix: "/client/assets/" },
  ],
  etag: true,
  cacheControl: "public, max-age=86400",
});
```

**Cache control**:
- **Dev** (`DENO_ENV=dev` or `BUN_ENV=dev`, default): Uses `devCacheControl` (no cache by default)
- **Prod** (`DENO_ENV=prod` or `BUN_ENV=prod`): Uses `cacheControl` (24h cache by default)

### Security Plugins

```typescript
import { securityPlugin, corsPlugin, rateLimitPlugin } from "@dreamer/plugins";

// Security headers
const security = securityPlugin({
  hsts: { maxAge: 31536000, includeSubDomains: true },
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
  frameOptions: "DENY",
  contentTypeNosniff: true,
  xssFilter: true,
});

// CORS
const cors = corsPlugin({
  origin: ["https://example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  maxAge: 86400,
});

// Rate limit
const rateLimit = rateLimitPlugin({
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  skipPaths: ["/health"],
  keyGenerator: (req) => req.headers.get("x-forwarded-for") || "unknown",
});
```

### Social Share Plugin

```typescript
import { socialPlugin } from "@dreamer/plugins/social";

const plugin = socialPlugin({
  platforms: ["twitter", "facebook", "weibo", "wechat", "linkedin"],
  oauth: {
    github: {
      clientId: "your-github-client-id",
      clientSecret: "your-github-client-secret",
      redirectUri: "https://example.com/auth/github/callback",
    },
    google: {
      clientId: "your-google-client-id",
      clientSecret: "your-google-client-secret",
      redirectUri: "https://example.com/auth/google/callback",
    },
  },
});

// Generate share link
const socialService = container.get("socialService");
const twitterUrl = socialService.getShareUrl("twitter", {
  url: "https://example.com",
  title: "Check this out!",
});

// Generate OAuth link
const githubAuthUrl = socialService.getOAuthUrl("github");
```

---

### Build System Integration

CSS plugins generate hashed filenames at build time. Build system can get compile result from compiler:

```typescript
const compiler = container.get("tailwindCompiler");
const lastResult = compiler.getLastResult();

console.log(lastResult.css);       // CSS content
console.log(lastResult.hash);      // "a51ff10f"
console.log(lastResult.filename);  // "tailwind.a51ff10f.css"
```

---

## 📚 API Reference

### Plugin List

| Plugin | Import | Description |
|--------|--------|-------------|
| `tailwindPlugin` | `@dreamer/plugins/tailwindcss` | TailwindCSS v4 |
| `unocssPlugin` | `@dreamer/plugins/unocss` | UnoCSS |
| `i18nPlugin` | `@dreamer/plugins/i18n` | i18n (incl. global $t) |
| `seoPlugin` | `@dreamer/plugins/seo` | SEO |
| `pwaPlugin` | `@dreamer/plugins/pwa` | PWA |
| `analyticsPlugin` | `@dreamer/plugins/analytics` | Analytics |
| `themePlugin` | `@dreamer/plugins/theme` | Theme |
| `authPlugin` | `@dreamer/plugins/auth` | Auth |
| `securityPlugin` | `@dreamer/plugins/security` | Security headers |
| `corsPlugin` | `@dreamer/plugins/cors` | CORS |
| `rateLimitPlugin` | `@dreamer/plugins/ratelimit` | Rate limit |
| `staticPlugin` | `@dreamer/plugins/static` | Static files |
| `compressionPlugin` | `@dreamer/plugins/compression` | Compression |
| `socialPlugin` | `@dreamer/plugins/social` | Social share/OAuth |

### Standalone Client Libraries

Client features moved to separate packages:

| Package | Import | Description |
|---------|--------|-------------|
| `@dreamer/i18n` | `jsr:@dreamer/i18n` | i18n (client/server) |
| `@dreamer/theme` | `jsr:@dreamer/theme` | Theme (TailwindCSS/UnoCSS) |

### Event Hooks

All plugins implement these hooks (as needed):

| Hook | Description |
|------|-------------|
| `onInit` | Register services |
| `onRequest` | Before request (locale, auth, CSS compile) |
| `onResponse` | After response (meta, compression, headers) |
| `onBuildComplete` | After build (e.g. Sitemap) |

---

## 📊 Test Report

[![Tests](https://img.shields.io/badge/tests-322%20passed-brightgreen)](./TEST_REPORT.md)

### Unit Tests

| Metric | Value |
|--------|-------|
| Total tests | 322 |
| Passed | 322 |
| Failed | 0 |
| Pass rate | 100% |
| Test date | 2026-02-01 |

### CSS Compiler Tests

| Compiler | Status | Stack | Output size |
|----------|--------|-------|-------------|
| TailwindCSS v4 | ✅ Pass | PostCSS + @tailwindcss/postcss | 9417 chars |
| UnoCSS | ✅ Pass | @unocss/core + preset-wind | 3294 chars |

See [TEST_REPORT.md](./TEST_REPORT.md) for details.

---

## 📝 Notes

1. **Dependencies**: All plugins depend on `@dreamer/plugin`.

2. **Event-driven**: Plugins use hooks for lifecycle; no `install`/`activate` methods.

3. **Service registration**: Plugins register services in `onInit`; use `container.get()` to access.

4. **CSS compilation**:
   - **TailwindCSS v4**: PostCSS + @tailwindcss/postcss, `content` optional
   - **UnoCSS**: @unocss/core + preset-wind, class scanning
   - Dev: live compile; Prod: precompiled CSS

5. **Config validation**: All plugins provide `validateConfig`.

6. **Client libraries**: Use `@dreamer/i18n` and `@dreamer/theme` for browser.

7. **Global $t**: Use `$t` and `$i18n` from `@dreamer/i18n` for i18n.

8. **JSR compatibility**: Type-safe global handling for JSR publish.

---

## 📜 Changelog

### [1.0.2] - 2026-02-08

- **UnoCSS**: Added `safelist` option for dynamic class names
- **UnoCSS**: Fixed content glob scanning to respect pattern directory

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📄 License

MIT License - see [LICENSE.md](./LICENSE.md)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
