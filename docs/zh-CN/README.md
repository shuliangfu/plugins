# @dreamer/plugins

> 📖 [English](../../README.md) | 中文

> 一个兼容 Deno、Bun 和 Node.js 22+ 的官方插件集合，提供 CSS
> 原子化、国际化、SEO、PWA、认证、计划任务（Cron）等开箱即用的 Web 应用功能插件

[![JSR](https://jsr.io/badges/@dreamer/plugins)](https://jsr.io/@dreamer/plugins)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Tests](https://img.shields.io/badge/tests-365%20passed-brightgreen)](./TEST_REPORT.md)
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

### Node.js 22+

```bash
npx jsr add @dreamer/plugins
```

---

## 🌍 环境兼容性

| 环境       | 版本要求          | 状态                                                             |
| ---------- | ----------------- | ---------------------------------------------------------------- |
| **Deno**   | 2.9+              | ✅ 完全支持                                                      |
| **Bun**    | 1.3+              | ✅ 完全支持                                                      |
| **Node.js** | 22+              | ✅ 完全支持                                                      |
| **服务端** | -                 | ✅ 支持（兼容 Deno、Bun、Node.js 运行时）                        |
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
- **RateLimit**：按 IP 窗口限流，支持 **`skip`** 排除路径、可选 **`include`**
  仅对白名单路径限流、可选 **`pluginName`** 多实例并存

### 其他插件

- **Analytics**：分析统计（Google Analytics、Plausible）
- **Theme**：主题切换（亮色/暗色/系统模式）
- **Compression**：响应压缩（gzip、deflate）
- **Static**：静态文件服务（多目录配置、MIME
  类型、ETag、环境缓存控制、安全防护）
- **Social**：社交分享和 OAuth 登录
- **Scheduled**：计划任务（Cron，`onStart` / `onStop`），独立 `@dreamer/logger`
  输出
- **Queue**：`@dreamer/queue` 队列服务端（`QueueManager`），可配置日志

---

## 🎯 使用场景

- **现代 CSS 开发**：使用 TailwindCSS 或 UnoCSS 进行原子化 CSS 开发
- **多语言应用**：构建支持多种语言的国际化应用
- **SEO 优化**：提升搜索引擎排名和社交媒体分享效果
- **PWA 应用**：构建可安装的渐进式 Web 应用
- **安全防护**：添加安全头、CORS、速率限制
- **用户认证**：JWT、Bearer Token、Basic Auth 认证
- **计划任务**：按 Cron 表达式定时执行命令或脚本（独立日志文件）
- **任务队列**：集成 `@dreamer/queue`，后台消费任务（独立日志文件）

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
`$i18n`，可以在项目中添加全局类型声明文件（如 `global.d.ts`）， 然后在
`deno.json` 或 `tsconfig.json` 中引用：

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
import {
  corsPlugin,
  rateLimitContainerKeys,
  rateLimitPlugin,
  securityPlugin,
} from "@dreamer/plugins";

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

// 速率限制（默认键：从 X-Forwarded-For / X-Real-Ip 取 IP，否则为 "unknown"）
const rateLimit = rateLimitPlugin({
  max: 100,
  windowMs: 60 * 1000, // 1 分钟
  skip: ["/health", "/api/health"],
});

// 同一应用注册多个实例须设置不同 pluginName，否则深度合并会覆盖同名插件。
// include：仅匹配的路径计入本插件配额（v1.1.2+）。
const loginRateLimit = rateLimitPlugin({
  pluginName: "my-app-login-ratelimit",
  max: 40,
  windowMs: 15 * 60 * 1000,
  include: ["/api/auth/login"],
});

// 运行时读取：container.get(rateLimitContainerKeys("my-app-login-ratelimit").serviceKey)
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

### 计划任务（Cron）插件

在应用触发 **`onStart`**（服务已开始监听）时注册 Cron，在 **`onStop`**
时关闭定时器。底层使用 `@dreamer/runtime-adapter` 的 **`cron()`**，表达式与
node-cron 一致（**5 段从分** 或 **6 段从秒**）。

**子路径导入**（也可从包根 `@dreamer/plugins` 再导出项中引入
`scheduledPlugin`）：

```typescript
import { type LoggerConfig, scheduledPlugin } from "@dreamer/plugins/scheduled";
```

**签名**：**`scheduledPlugin(tasks, logger?)`** —— 第一参为任务数组，第二参为与
[APP_CONFIG.md](../../../dweb/docs/zh-CN/APP_CONFIG.md) 中 **`logger`** 同形的
**`LoggerConfig`**（可选；缺省则仅控制台等默认行为）。

**单条任务**：**`command`**（argv，首项为可执行文件）与 **`script`**
（相对路径脚本，可选 `cwd`；由当前运行时 `execPath()` 执行，默认 `deno run -A`）
**二选一**；**`cron`** 必填。非法 **`tasks`** 在调用 **`scheduledPlugin(...)`**
时即抛错。

**日志**：统一 **`@dreamer/logger`**。若容器内已有应用
**`Logger`**，第二参会通过 **`child()`**
合并，计划任务写入独立文件，与主应用日志分流。

**示例**：

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

### 队列插件（`@dreamer/queue`）

在 **`onStart`** 中创建 **`QueueManager`**
并注册到服务容器（与计划任务相同：可选第二参
**`LoggerConfig`**，支持独立文件、轮转等）。**`manager.adapter`** 必填（如
**`MemoryQueueAdapter`**、Redis 等适配器）；**`queues`** 中可声明 **`process`**
订阅消费。

**子路径导入**：

```typescript
import {
  type LoggerConfig,
  queuePlugin,
  type QueuePluginOptions,
} from "@dreamer/plugins/queue";
```

**签名**：**`queuePlugin(options, logger?)`**

**示例**：

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
| `scheduledPlugin`   | `@dreamer/plugins/scheduled`   | 计划任务 / Cron         |
| `queuePlugin`       | `@dreamer/plugins/queue`       | 队列（@dreamer/queue）  |

### 独立客户端包

客户端功能已移至独立包，可直接在浏览器中使用：

| 包               | 导入路径             | 说明                           |
| ---------------- | -------------------- | ------------------------------ |
| `@dreamer/i18n`  | `jsr:@dreamer/i18n`  | 国际化（客户端/服务端通用）    |
| `@dreamer/theme` | `jsr:@dreamer/theme` | 主题切换（TailwindCSS/UnoCSS） |

### 事件钩子

所有插件都实现以下事件钩子（按需）：

| 钩子              | 说明                                         |
| ----------------- | -------------------------------------------- |
| `onInit`          | 初始化时注册服务                             |
| `onStart`         | 服务监听就绪后（如注册计划任务）             |
| `onRequest`       | 请求处理前（如语言检测、认证、CSS 编译）     |
| `onResponse`      | 响应处理后（如注入 meta 标签、压缩、安全头） |
| `onStop`          | 应用优雅停止                                 |
| `onBuildComplete` | 构建完成后（如生成 Sitemap）                 |

---

## 📊 测试报告

[![Tests](https://img.shields.io/badge/tests-365%20passed-brightgreen)](./TEST_REPORT.md)

### 单元测试

| 指标     | 值         |
| -------- | ---------- |
| 总测试数 | 365        |
| 通过     | 365        |
| 失败     | 0          |
| 通过率   | 100%       |
| 测试时间 | 2026-07-23 |

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

6. **独立客户端包**：客户端功能已移至独立包（`@dreamer/i18n`、`@dreamer/theme`），可直接在浏览器中使用。

7. **全局 $t 方法**：使用 `@dreamer/i18n` 包的 `$t`和`$i18n` 函数进行国际化。

8. **JSR 兼容**：所有模块都使用类型安全的方式处理全局变量，确保 JSR 发布兼容性。

---

## 📜 变更日志

### [1.1.5] - 2026-04-27

- **变更** — **i18n** / **scheduled** / **queue**
  插件：启动类诊断输出（初始化语言、 Cron 注册数、queue manager 启动）改为
  **`debug`**，不再默认在 **info** 刷屏。

完整版本历史详见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
