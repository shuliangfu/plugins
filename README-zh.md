# @dreamer/plugins

> 一个兼容 Deno 和 Bun 的官方插件集合，提供 CSS
> 原子化、国际化、SEO、PWA、认证等开箱即用的 Web 应用功能插件

[English](./README.md) | 中文 (Chinese)

[![JSR](https://jsr.io/badges/@dreamer/plugins)](https://jsr.io/@dreamer/plugins)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/tests-322%20passed-brightgreen)](./TEST_REPORT.md)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.1-38bdf8)](https://tailwindcss.com)
[![UnoCSS](https://img.shields.io/badge/UnoCSS-v66+-333)](https://unocss.dev)

---

## 🎯 功能

官方插件集合，为 dweb 框架提供常用的功能扩展。依赖 `@dreamer/plugin`
插件管理系统，用于注册和管理插件生命周期。

---

## 📦 安装

### Deno

```bash
deno add jsr:@dreamer/plugins
```

### Bun

```bash
bunx jsr add @dreamer/plugins
```

---

## 🌍 环境兼容性

| 环境       | 版本要求          | 状态                                                             |
| ---------- | ----------------- | ---------------------------------------------------------------- |
| **Deno**   | 2.5+              | ✅ 完全支持                                                      |
| **Bun**    | 1.0+              | ✅ 完全支持                                                      |
| **服务端** | -                 | ✅ 支持（兼容 Deno 和 Bun 运行时）                               |
| **客户端** | -                 | ✅ 支持（主题使用 `@dreamer/theme`，国际化使用 `@dreamer/i18n`） |
| **依赖**   | `@dreamer/plugin` | 📦 插件管理系统（必须）                                          |

---

## ✨ 特性

### CSS 处理插件

- **TailwindCSS v4**：自动编译、热重载、生产优化（使用 PostCSS +
  @tailwindcss/postcss）
- **UnoCSS**：预设系统、图标支持、高性能构建（使用 @unocss/core + preset-wind）
- **配置简化**：`content` 参数可选，TailwindCSS v4 推荐在 CSS 文件中使用
  `@source` 指令

### 国际化插件（i18n）

- 多语言检测和切换
- 翻译文件管理
- 路由本地化
- 日期和数字格式化
- **服务端全局 $t 方法**：在服务端直接使用 `$t()` 翻译
- **客户端模块**：提供浏览器端翻译函数

### SEO 优化插件

- 自动生成 meta 标签
- Sitemap 和 Robots.txt 生成
- Open Graph 和 Twitter Card 支持
- 结构化数据（JSON-LD）

### PWA 插件

- Service Worker 注册
- Web App Manifest 生成
- 离线支持
- 推送通知

### 认证插件（Auth）

- JWT 认证
- Bearer Token 认证
- Basic 认证
- 角色和权限验证
- 公开路径配置

### 安全插件

- **Security**：安全头注入（CSP、HSTS、X-Frame-Options 等）
- **CORS**：跨域资源共享配置
- **RateLimit**：请求速率限制

### 其他插件

- **Analytics**：分析统计（Google Analytics、Plausible）
- **Theme**：主题切换（亮色/暗色/系统模式）
- **Compression**：响应压缩（gzip、deflate）
- **Static**：静态文件服务（多目录配置、MIME
  类型、ETag、环境缓存控制、安全防护）
- **Social**：社交分享和 OAuth 登录

---

## 🎯 使用场景

- **现代 CSS 开发**：使用 TailwindCSS 或 UnoCSS 进行原子化 CSS 开发
- **多语言应用**：构建支持多种语言的国际化应用
- **SEO 优化**：提升搜索引擎排名和社交媒体分享效果
- **PWA 应用**：构建可安装的渐进式 Web 应用
- **安全防护**：添加安全头、CORS、速率限制
- **用户认证**：JWT、Bearer Token、Basic Auth 认证

---

## 🚀 快速开始

### 基础用法

```typescript
import { PluginManager } from "@dreamer/plugin";
import { ServiceContainer } from "@dreamer/service";
import {
  i18nPlugin,
  seoPlugin,
  tailwindPlugin,
  themePlugin,
} from "@dreamer/plugins";

// 创建服务容器和插件管理器
const container = new ServiceContainer();
const pluginManager = new PluginManager(container);

// 添加插件
// TailwindCSS v4：content 可选，推荐在 CSS 文件中使用 @source 指令
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

// 触发初始化
await pluginManager.triggerInit();
```

### 与 dweb 框架集成

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
    // TailwindCSS v4（content 可选，推荐在 CSS 文件中使用 @source 指令）
    tailwindPlugin({
      cssEntry: "./src/assets/tailwind.css",
    }),

    // PWA 支持
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

    // 主题切换
    themePlugin({
      defaultMode: "system",
    }),

    // 认证
    authPlugin({
      type: "jwt",
      jwt: { secret: "your-secret-key" },
      protectedPaths: ["/api/"],
      publicPaths: ["/api/auth/login"],
    }),

    // 安全头
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

## 🎨 使用示例

### TailwindCSS v4 插件

```typescript
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// 基础用法（推荐：在 CSS 文件中使用 @source 指令）
const plugin = tailwindPlugin({
  cssEntry: "./src/assets/tailwind.css",
});

// 完整配置
const plugin = tailwindPlugin({
  cssEntry: "./src/assets/tailwind.css",
  content: ["./src/**/*.{ts,tsx}"], // 可选，推荐使用 @source 指令
  config: "./tailwind.config.ts", // 可选
  assetsPath: "/assets", // 静态资源 URL 路径（默认 "/assets"）
  jit: true, // 默认开启
  darkMode: "class", // 暗色模式策略
});
```

**CSS 入口文件示例 (tailwind.css):**

```css
/* TailwindCSS v4 使用 @source 指令指定扫描路径 */
@source "../**/*.{ts,tsx}";

@import "tailwindcss";

/* 自定义样式 */
.custom-class {
  @apply bg-blue-500 text-white;
}
```

### UnoCSS 插件

```typescript
import { unocssPlugin } from "@dreamer/plugins/unocss";

// 基础用法
const plugin = unocssPlugin({
  cssEntry: "./src/assets/unocss.css",
  content: ["./src/**/*.{ts,tsx}"],
});

// 完整配置
const plugin = unocssPlugin({
  cssEntry: "./src/assets/unocss.css",
  content: ["./src/**/*.{ts,tsx}"],
  assetsPath: "/assets", // 静态资源 URL 路径（默认 "/assets"）
  presets: ["@unocss/preset-wind"], // TailwindCSS 兼容
  icons: true, // 启用图标系统
  shortcuts: {
    "btn": "px-4 py-2 rounded bg-blue-500 text-white",
  },
});
```

### 认证插件

```typescript
import { authPlugin } from "@dreamer/plugins/auth";

const plugin = authPlugin({
  type: "jwt",
  jwt: {
    secret: "your-jwt-secret",
    expiresIn: 3600 * 24 * 7, // 7 天
  },
  protectedPaths: ["/api/", "/admin/"],
  publicPaths: ["/api/login", "/api/register"],
  roles: {
    "/admin/": ["admin"],
    "/api/users/": ["admin", "moderator"],
  },
});

// 在处理器中获取用户
const authService = container.get("authService");
const user = authService.getUser(context);
if (authService.hasRole(user, "admin")) {
  // 管理员操作
}
```

### 国际化插件

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

// 加载翻译数据
$i18n.loadTranslations("zh-CN", {
  hello: "你好",
  welcome: "欢迎 {name}",
  menu: {
    home: "首页",
    about: "关于",
  },
});

// 使用导出的 $t 方法
console.log($t("hello")); // "你好"
console.log($t("welcome", { name: "张三" })); // "欢迎 张三"
console.log($t("menu.home")); // "首页"

// 使用 $i18n 服务
$i18n.setLocale("en-US");
console.log($i18n.getLocale()); // "en-US"
```

#### 全局 $t 类型声明（可选）

如果你希望在任何文件中不需要 import 就能直接使用 `$t` 和
`$i18n`，可以从本仓库复制 [`src/i18n/global.d.ts`](./src/i18n/global.d.ts)
到你的项目中，然后在 `deno.json` 或 `tsconfig.json` 中引用：

```json
{
  "compilerOptions": {
    "types": ["./global.d.ts"]
  }
}
```

或者在文件顶部添加三斜杠引用：

```typescript
/// <reference path="./global.d.ts" />

// 然后可以直接使用，无需 import
const text = $t("hello");
$i18n.setLocale("en-US");
```

### 静态文件插件

```typescript
import { staticPlugin } from "@dreamer/plugins/static";

// 基础用法（默认 root: "assets", prefix: "/assets"）
const plugin = staticPlugin();

// 单目录配置
const plugin = staticPlugin({
  root: "./public",
  prefix: "/static",
  index: ["index.html"],
  etag: true,
  cacheControl: "public, max-age=31536000, immutable", // 生产环境缓存
  // 开发环境自动使用 "no-cache, no-store, must-revalidate"
  mimeTypes: {
    ".wasm": "application/wasm",
  },
});

// 多目录配置（支持同时服务多个静态目录）
const plugin = staticPlugin({
  statics: [
    { root: "./assets", prefix: "/assets" },
    { root: "./dist/client/assets", prefix: "/client/assets/" },
  ],
  etag: true,
  cacheControl: "public, max-age=86400",
});
```

**缓存控制说明**：

- **开发环境**（`DENO_ENV=dev` 或 `BUN_ENV=dev`，默认）：自动使用
  `devCacheControl`（默认禁用缓存）
- **生产环境**（`DENO_ENV=prod` 或 `BUN_ENV=prod`）：使用
  `cacheControl`（默认缓存 24 小时）

### 安全插件

```typescript
import { corsPlugin, rateLimitPlugin, securityPlugin } from "@dreamer/plugins";

// 安全头
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

// 速率限制
const rateLimit = rateLimitPlugin({
  max: 100,
  windowMs: 60 * 1000, // 1 分钟
  skipPaths: ["/health"],
  keyGenerator: (req) => req.headers.get("x-forwarded-for") || "unknown",
});
```

### 社交分享插件

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

// 生成分享链接
const socialService = container.get("socialService");
const twitterUrl = socialService.getShareUrl("twitter", {
  url: "https://example.com",
  title: "Check this out!",
});

// 生成 OAuth 链接
const githubAuthUrl = socialService.getOAuthUrl("github");
```

---

### 构建系统集成

CSS 插件在构建时会生成带 hash 的文件名，构建系统可从编译器获取编译结果：

```typescript
const compiler = container.get("tailwindCompiler");
const lastResult = compiler.getLastResult();

console.log(lastResult.css); // CSS 内容
console.log(lastResult.hash); // "a51ff10f"
console.log(lastResult.filename); // "tailwind.a51ff10f.css"
```

---

## 📚 API 文档

### 插件列表

| 插件                | 导入路径                       | 说明                    |
| ------------------- | ------------------------------ | ----------------------- |
| `tailwindPlugin`    | `@dreamer/plugins/tailwindcss` | TailwindCSS v4 支持     |
| `unocssPlugin`      | `@dreamer/plugins/unocss`      | UnoCSS 支持             |
| `i18nPlugin`        | `@dreamer/plugins/i18n`        | 国际化支持（含全局 $t） |
| `seoPlugin`         | `@dreamer/plugins/seo`         | SEO 优化                |
| `pwaPlugin`         | `@dreamer/plugins/pwa`         | PWA 支持                |
| `analyticsPlugin`   | `@dreamer/plugins/analytics`   | 分析统计                |
| `themePlugin`       | `@dreamer/plugins/theme`       | 主题切换                |
| `authPlugin`        | `@dreamer/plugins/auth`        | 认证授权                |
| `securityPlugin`    | `@dreamer/plugins/security`    | 安全头                  |
| `corsPlugin`        | `@dreamer/plugins/cors`        | CORS 跨域               |
| `rateLimitPlugin`   | `@dreamer/plugins/ratelimit`   | 速率限制                |
| `staticPlugin`      | `@dreamer/plugins/static`      | 静态文件                |
| `compressionPlugin` | `@dreamer/plugins/compression` | 响应压缩                |
| `socialPlugin`      | `@dreamer/plugins/social`      | 社交分享/OAuth          |

### 独立客户端库

客户端功能已移至独立库，可直接在浏览器中使用：

| 库               | 导入路径             | 说明                           |
| ---------------- | -------------------- | ------------------------------ |
| `@dreamer/i18n`  | `jsr:@dreamer/i18n`  | 国际化（客户端/服务端通用）    |
| `@dreamer/theme` | `jsr:@dreamer/theme` | 主题切换（TailwindCSS/UnoCSS） |

### 事件钩子

所有插件都实现以下事件钩子（按需）：

| 钩子              | 说明                                         |
| ----------------- | -------------------------------------------- |
| `onInit`          | 初始化时注册服务                             |
| `onRequest`       | 请求处理前（如语言检测、认证、CSS 编译）     |
| `onResponse`      | 响应处理后（如注入 meta 标签、压缩、安全头） |
| `onBuildComplete` | 构建完成后（如生成 Sitemap）                 |

---

## 📊 测试报告

[![Tests](https://img.shields.io/badge/tests-322%20passed-brightgreen)](./TEST_REPORT.md)

### 单元测试

| 指标     | 值         |
| -------- | ---------- |
| 总测试数 | 322        |
| 通过     | 322        |
| 失败     | 0          |
| 通过率   | 100%       |
| 测试时间 | 2026-02-02 |

### CSS 编译器实际测试

| 编译器         | 状态    | 技术栈                         | 输出大小  |
| -------------- | ------- | ------------------------------ | --------- |
| TailwindCSS v4 | ✅ 通过 | PostCSS + @tailwindcss/postcss | 9417 字符 |
| UnoCSS         | ✅ 通过 | @unocss/core + preset-wind     | 3294 字符 |

详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)

---

## 📝 注意事项

1. **依赖关系**：所有插件都依赖 `@dreamer/plugin` 插件管理系统。

2. **事件驱动**：插件通过事件钩子响应应用生命周期，不需要实现
   `install`/`activate` 等生命周期方法。

3. **服务注册**：插件在 `onInit` 钩子中注册服务到容器，可通过 `container.get()`
   获取。

4. **CSS 编译**：
   - **TailwindCSS v4**：使用 PostCSS + @tailwindcss/postcss 编译，`content`
     参数可选
   - **UnoCSS**：使用 @unocss/core + preset-wind 编译，支持类名扫描
   - 开发模式下实时编译，生产模式使用预编译 CSS

5. **配置验证**：所有插件都提供 `validateConfig` 方法验证配置有效性。

6. **独立客户端库**：客户端功能已移至独立库（`@dreamer/i18n`、`@dreamer/theme`），可直接在浏览器中使用。

7. **全局 $t 方法**：使用 `@dreamer/i18n` 库的 `$t`和`$i18n` 函数进行国际化。

8. **JSR 兼容**：所有模块都使用类型安全的方式处理全局变量，确保 JSR 发布兼容性。

---

## 📜 变更日志

### [1.0.4] - 2026-02-08

- **Fixed**：Static、TailwindCSS、UnoCSS 使用 `join()` 构建路径（Windows 兼容）

完整版本历史详见 [CHANGELOG-zh.md](./CHANGELOG-zh.md)。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 详见 [LICENSE.md](./LICENSE.md)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
