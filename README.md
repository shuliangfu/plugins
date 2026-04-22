# @dreamer/plugins

> Official plugin collection for Deno and Bun: CSS utilities, i18n, SEO, PWA,
> auth, scheduled tasks (Cron), and more

English | [中文 (Chinese)](./docs/zh-CN/README.md)

[![JSR](https://jsr.io/badges/@dreamer/plugins)](https://jsr.io/@dreamer/plugins)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-365%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.1-38bdf8)](https://tailwindcss.com)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-v66+-333)](https://unocss.dev)

---

## 🎯 Features

Official plugin collection for the dweb framework. Depends on `@dreamer/plugin`
for lifecycle management.

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

| Environment      | Version           | Status                                        |
| ---------------- | ----------------- | --------------------------------------------- |
| **Deno**         | 2.5+              | ✅ Full support                               |
| **Bun**          | 1.0+              | ✅ Full support                               |
| **Server**       | -                 | ✅ Deno/Bun compatible                        |
| **Client**       | -                 | ✅ Theme: @dreamer/theme, i18n: @dreamer/i18n |
| **Dependencies** | `@dreamer/plugin` | 📦 Required                                   |

---

## ✨ Characteristics

### CSS Plugins

- **TailwindCSS v4**: Auto compile, HMR, production optimization (PostCSS +
  @tailwindcss/postcss)
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
- **RateLimit**: Per-IP windows, **`skip`** paths, optional **`include`**
  whitelist-only paths, optional **`pluginName`** for multiple instances

### Other Plugins

- **Analytics**: Google Analytics, Plausible
- **Theme**: Light/dark/system mode
- **Compression**: gzip, deflate
- **Static**: Multi-dir, MIME, ETag, cache, security
- **Social**: Share links and OAuth
- **Scheduled**: Cron jobs (`onStart` / `onStop`), dedicated `@dreamer/logger`
  output

---

## 🎯 Use Cases

- **Modern CSS**: TailwindCSS or UnoCSS
- **i18n**: Multi-language apps
- **SEO**: Search ranking and social sharing
- **PWA**: Installable progressive web apps
- **Security**: Headers, CORS, rate limiting
- **Auth**: JWT, Bearer Token, Basic Auth
- **Scheduled tasks**: Run scripts or commands on a cron schedule (separate log
  file)
- **Queue**: `@dreamer/queue` server (`QueueManager`) with configurable logging

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { PluginManager } from "@dreamer/plugin";
import { ServiceContainer } from "@dreamer/service";
import {
  i18nPlugin,
  seoPlugin,
  tailwindPlugin,
  themePlugin,
} from "@dreamer/plugins";

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
  analyticsPlugin,
  authPlugin,
  corsPlugin,
  pwaPlugin,
  securityPlugin,
  tailwindPlugin,
  themePlugin,
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
  config: "./tailwind.config.ts", // Optional
  assetsPath: "/assets", // Static asset URL (default "/assets")
  jit: true, // Default on
  darkMode: "class", // Dark mode strategy
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
  assetsPath: "/assets", // Static asset URL (default "/assets")
  presets: ["@unocss/preset-wind"], // TailwindCSS compatible (string)
  icons: true, // Enable icons
  shortcuts: {
    "btn": "px-4 py-2 rounded bg-blue-500 text-white",
  },
});
```

**Using UnoCSS preset-wind4 and daisyUI:** `presets` accepts either module-name
strings (e.g. `"@unocss/preset-wind3"`) or **preset instances**. For
`@unocss/preset-wind4` and `unocss-preset-daisy` (e.g.
[ameinhardt/unocss-preset-daisy](https://github.com/ameinhardt/unocss-preset-daisy)),
add the packages to your project and pass the preset instances in `main.ts`:

```typescript
import presetWind4 from "@unocss/preset-wind4";
import presetDaisy from "unocss-preset-daisy";

app.registerPlugin(unocssPlugin({
  output: "dist/client/assets",
  cssEntry: "assets/uno.css",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [presetWind4(), presetDaisy()],
}));
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
import { $i18n, $t, i18nPlugin } from "@dreamer/plugins/i18n";

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

To use `$t` and `$i18n` without import, add a global type declaration file (e.g.
`global.d.ts`) to your project and reference it in `deno.json` or
`tsconfig.json`:

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

- **Dev** (`DENO_ENV=dev` or `BUN_ENV=dev`, default): Uses `devCacheControl` (no
  cache by default)
- **Prod** (`DENO_ENV=prod` or `BUN_ENV=prod`): Uses `cacheControl` (24h cache
  by default)

### Security Plugins

```typescript
import {
  corsPlugin,
  rateLimitContainerKeys,
  rateLimitPlugin,
  securityPlugin,
} from "@dreamer/plugins";

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

// Rate limit (default key: IP from X-Forwarded-For / X-Real-Ip, else "unknown")
const rateLimit = rateLimitPlugin({
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  skip: ["/health", "/api/health"],
});

// Multiple instances must use distinct pluginName, or deepMergeConfig replaces
// same-named plugins. Optional include = only those paths count (v1.1.2+).
const loginRateLimit = rateLimitPlugin({
  pluginName: "my-app-login-ratelimit",
  max: 40,
  windowMs: 15 * 60 * 1000,
  include: ["/api/auth/login"],
});

// Runtime lookups: container.get(rateLimitContainerKeys("my-app-login-ratelimit").serviceKey)
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

### Scheduled tasks (Cron) plugin

Registers jobs when the app runs **`onStart`** (after the server is ready) and
stops them on **`onStop`**. Uses `@dreamer/runtime-adapter` **`cron()`**
(node-cron–compatible expressions: 5 fields from minute, or 6 from second).

**Import** (subpath recommended; `scheduledPlugin` is also re-exported from
`@dreamer/plugins`):

```typescript
import { type LoggerConfig, scheduledPlugin } from "@dreamer/plugins/scheduled";
```

**Signature**: **`scheduledPlugin(tasks, logger?)`** — first argument is the
task array; second is the same **`LoggerConfig`** shape as **`logger`** in
[APP_CONFIG.md](../dweb/docs/en-US/APP_CONFIG.md) (optional; omit for default
console-only behavior).

**Task shape**: each entry must have exactly one of **`command`** (argv array,
first element is the executable) or **`script`** (path resolved with optional
`cwd`; run via current runtime `execPath()`, default `deno run -A`). **`cron`**
is required. Invalid `tasks` throw when **`scheduledPlugin(...)`** is called.

**Logging**: always **`@dreamer/logger`**. If the container already has an app
**`Logger`**, the second argument is merged via **`child()`** so scheduled logs
can use a dedicated file, separate from the main app log.

**Example**:

```typescript
import { scheduledPlugin } from "@dreamer/plugins/scheduled";

scheduledPlugin(
  [
    {
      name: "daily",
      cron: "0 0 * * *",
      command: ["deno", "run", "-A", "./scripts/daily.ts"],
    },
    {
      cron: "0/30 * * * * *",
      script: "./scripts/tick.ts",
      cwd: ".",
    },
  ],
  {
    level: "info",
    format: "text",
    output: {
      console: false,
      file: {
        path: "./logs/scheduled.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
  },
);
```

### Queue plugin (`@dreamer/queue`)

Registers a **`QueueManager`** on **`onStart`** (same pattern as scheduled
tasks: optional second argument **`LoggerConfig`** for file output, rotation,
etc.). You supply a **`QueueAdapter`** (e.g. `MemoryQueueAdapter`,
Redis/RabbitMQ adapters from `@dreamer/queue`) and optional **`queues`** with
**`process`** handlers.

**Import**:

```typescript
import {
  type LoggerConfig,
  queuePlugin,
  type QueuePluginOptions,
} from "@dreamer/plugins/queue";
```

**Signature**: **`queuePlugin(options, logger?)`**

**Example**:

```typescript
import { MemoryQueueAdapter } from "@dreamer/queue";
import { queuePlugin } from "@dreamer/plugins/queue";

queuePlugin(
  {
    manager: { adapter: new MemoryQueueAdapter(), autoRecover: false },
    queues: [
      {
        name: "notifications",
        options: { concurrency: 2 },
        process: async (job) => {
          console.log(job.data);
        },
      },
    ],
  },
  {
    level: "info",
    output: {
      console: false,
      file: { path: "./logs/queue.log", rotate: true },
    },
  },
);
```

---

### Build System Integration

CSS plugins generate hashed filenames at build time. Build system can get
compile result from compiler:

```typescript
const compiler = container.get("tailwindCompiler");
const lastResult = compiler.getLastResult();

console.log(lastResult.css); // CSS content
console.log(lastResult.hash); // "a51ff10f"
console.log(lastResult.filename); // "tailwind.a51ff10f.css"
```

---

## 📚 API Reference

### Plugin List

| Plugin              | Import                         | Description                     |
| ------------------- | ------------------------------ | ------------------------------- |
| `tailwindPlugin`    | `@dreamer/plugins/tailwindcss` | TailwindCSS v4                  |
| `unocssPlugin`      | `@dreamer/plugins/unocss`      | UnoCSS                          |
| `i18nPlugin`        | `@dreamer/plugins/i18n`        | i18n (incl. global $t)          |
| `seoPlugin`         | `@dreamer/plugins/seo`         | SEO                             |
| `pwaPlugin`         | `@dreamer/plugins/pwa`         | PWA                             |
| `analyticsPlugin`   | `@dreamer/plugins/analytics`   | Analytics                       |
| `themePlugin`       | `@dreamer/plugins/theme`       | Theme                           |
| `authPlugin`        | `@dreamer/plugins/auth`        | Auth                            |
| `securityPlugin`    | `@dreamer/plugins/security`    | Security headers                |
| `corsPlugin`        | `@dreamer/plugins/cors`        | CORS                            |
| `rateLimitPlugin`   | `@dreamer/plugins/ratelimit`   | Rate limit                      |
| `staticPlugin`      | `@dreamer/plugins/static`      | Static files                    |
| `compressionPlugin` | `@dreamer/plugins/compression` | Compression                     |
| `socialPlugin`      | `@dreamer/plugins/social`      | Social share/OAuth              |
| `scheduledPlugin`   | `@dreamer/plugins/scheduled`   | Cron / scheduled tasks          |
| `queuePlugin`       | `@dreamer/plugins/queue`       | Queue server (`@dreamer/queue`) |

### Standalone Client Libraries

Client features moved to separate packages:

| Package          | Import               | Description                |
| ---------------- | -------------------- | -------------------------- |
| `@dreamer/i18n`  | `jsr:@dreamer/i18n`  | i18n (client/server)       |
| `@dreamer/theme` | `jsr:@dreamer/theme` | Theme (TailwindCSS/UnoCSS) |

### Event Hooks

All plugins implement these hooks (as needed):

| Hook              | Description                                 |
| ----------------- | ------------------------------------------- |
| `onInit`          | Register services                           |
| `onStart`         | After server listen (e.g. scheduled tasks)  |
| `onRequest`       | Before request (locale, auth, CSS compile)  |
| `onResponse`      | After response (meta, compression, headers) |
| `onStop`          | Graceful shutdown                           |
| `onBuildComplete` | After build (e.g. Sitemap)                  |

---

## 📊 Test Report

[![Tests](https://img.shields.io/badge/tests-365%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

### Unit Tests

| Metric      | Value      |
| ----------- | ---------- |
| Total tests | 365        |
| Passed      | 365        |
| Failed      | 0          |
| Pass rate   | 100%       |
| Test date   | 2026-04-17 |

### CSS Compiler Tests

| Compiler       | Status  | Stack                          | Output size |
| -------------- | ------- | ------------------------------ | ----------- |
| TailwindCSS v4 | ✅ Pass | PostCSS + @tailwindcss/postcss | 9417 chars  |
| UnoCSS         | ✅ Pass | @unocss/core + preset-wind     | 3294 chars  |

See [TEST_REPORT.md](./docs/en-US/TEST_REPORT.md) for details.

---

## 📝 Notes

1. **Dependencies**: All plugins depend on `@dreamer/plugin`.

2. **Event-driven**: Plugins use hooks for lifecycle; no `install`/`activate`
   methods.

3. **Service registration**: Plugins register services in `onInit`; use
   `container.get()` to access.

4. **CSS compilation**:
   - **TailwindCSS v4**: PostCSS + @tailwindcss/postcss, `content` optional
   - **UnoCSS**: @unocss/core + preset-wind, class scanning
   - Dev: live compile; Prod: precompiled CSS

5. **Config validation**: All plugins provide `validateConfig`.

6. **Client libraries**: Use `@dreamer/i18n` and `@dreamer/theme` for browser.

7. **Global $t**: Use `$t`and`$i18n`from`@dreamer/i18n` for i18n.

8. **JSR compatibility**: Type-safe global handling for JSR publish.

---

## 📜 Changelog

### [1.1.4] - 2026-04-22

- **Changed** — CSS / static / analytics plugins use **`RUNTIME_ENV`** only for
  dev detection (aligned with dweb); **`isRuntimeEnvDev()`** in
  `internal/runtime-env.ts`.

See [CHANGELOG.md](./docs/en-US/CHANGELOG.md) for full version history.

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📄 License

Apache License 2.0 - see [LICENSE](./LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
