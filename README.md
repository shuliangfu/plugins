# @dreamer/plugins

> 一个兼容 Deno 和 Bun 的官方插件集合，提供 CSS 原子化、国际化、SEO、PWA、支付、认证、上传等开箱即用的 Web 应用功能插件

[![JSR](https://jsr.io/badges/@dreamer/plugins)](https://jsr.io/@dreamer/plugins)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/tests-551%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

官方插件集合，为 dweb 框架提供常用的功能扩展。依赖 `@dreamer/plugin` 插件管理系统，用于注册和管理插件生命周期。

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

| 环境 | 版本要求 | 状态 |
|------|---------|------|
| **Deno** | 2.5+ | ✅ 完全支持 |
| **Bun** | 1.0+ | ✅ 完全支持 |
| **服务端** | - | ✅ 支持（兼容 Deno 和 Bun 运行时） |
| **客户端** | - | ✅ 支持（提供 i18n/client 和 theme/client 模块） |
| **依赖** | `@dreamer/plugin` | 📦 插件管理系统（必须） |

---

## ✨ 特性

### CSS 处理插件
- **TailwindCSS v4**：自动配置、热重载、生产优化
- **UnoCSS**：预设系统、图标支持、高性能构建

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

### 支付插件（Payment）
- **8 种支付方式**：Stripe、PayPal、支付宝、微信支付、Apple Pay、Google Pay、银联、Web3
- 统一的支付接口
- 支持回调通知处理
- 可配置日志记录

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

### 文件处理插件
- **Upload**：文件上传验证（大小、类型、扩展名）
- **Static**：静态文件服务（MIME 类型、ETag、安全防护）
- **Image**：图片处理（懒加载、srcset、响应式）

### 其他插件
- **Analytics**：分析统计（Google Analytics、Plausible）
- **Theme**：主题切换（亮色/暗色/系统模式）
- **Captcha**：验证码生成和验证
- **Compression**：响应压缩（gzip、deflate）
- **Notification**：通知推送（Web Push、Email、SMS、Webhook）
- **Markdown**：Markdown 渲染（语法高亮、Front Matter、目录）
- **Social**：社交分享和 OAuth 登录

---

## 🎯 使用场景

- **现代 CSS 开发**：使用 TailwindCSS 或 UnoCSS 进行原子化 CSS 开发
- **多语言应用**：构建支持多种语言的国际化应用
- **SEO 优化**：提升搜索引擎排名和社交媒体分享效果
- **PWA 应用**：构建可安装的渐进式 Web 应用
- **支付集成**：快速集成多种支付方式
- **安全防护**：添加安全头、CORS、速率限制
- **文件管理**：处理文件上传和静态资源服务

---

## 🚀 快速开始

### 基础用法

```typescript
import { PluginManager } from "@dreamer/plugin";
import { ServiceContainer } from "@dreamer/service";
import { tailwindPlugin, i18nPlugin, seoPlugin, themePlugin } from "@dreamer/plugins";

// 创建服务容器和插件管理器
const container = new ServiceContainer();
const pluginManager = new PluginManager(container);

// 添加插件
await pluginManager.use(tailwindPlugin({
  content: ["./src/**/*.{ts,tsx}"],
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
  themes: {
    light: { "color-primary": "#3b82f6" },
    dark: { "color-primary": "#60a5fa" },
  },
}));

// 触发初始化
await pluginManager.triggerInit();
```

### 与 dweb 框架集成

```typescript
import { App } from "@dreamer/dweb";
import {
  tailwindPlugin,
  pwaPlugin,
  analyticsPlugin,
  themePlugin,
  paymentPlugin,
  authPlugin,
  securityPlugin,
} from "@dreamer/plugins";

const app = new App({
  plugins: [
    // TailwindCSS v4
    tailwindPlugin({
      content: ["./src/**/*.{ts,tsx}"],
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

    // 支付集成
    paymentPlugin({
      defaultAdapter: "stripe",
      adapters: {
        stripe: {
          publicKey: "pk_test_xxx",
          secretKey: "sk_test_xxx",
        },
      },
    }),

    // 认证
    authPlugin({
      type: "jwt",
      secret: "your-secret-key",
      protectedPaths: ["/api/*"],
    }),

    // 安全头
    securityPlugin({
      hsts: { maxAge: 31536000 },
      csp: { defaultSrc: ["'self'"] },
    }),
  ],
});

await app.start();
```

---

## 🎨 使用示例

### 支付插件

```typescript
import { paymentPlugin } from "@dreamer/plugins/payment";

const plugin = paymentPlugin({
  defaultAdapter: "stripe",
  routePrefix: "/api/payment",
  adapters: {
    stripe: {
      publicKey: "pk_test_xxx",
      secretKey: "sk_test_xxx",
      webhookSecret: "whsec_xxx",
    },
    alipay: {
      appId: "your-app-id",
      privateKey: "your-private-key",
      alipayPublicKey: "alipay-public-key",
    },
    wechat: {
      appId: "your-app-id",
      mchId: "your-mch-id",
      apiKey: "your-api-key",
    },
    web3: {
      merchantAddress: "0x1234...",
      chainId: 1,
      supportedTokens: ["ETH", "USDT", "USDC"],
    },
  },
  logging: {
    enabled: true,
    level: "info",
  },
});

// 使用支付服务
const paymentService = container.get("paymentService");
const result = await paymentService.createPayment("stripe", {
  orderId: "order-123",
  amount: 100,
  currency: "USD",
});
```

### 认证插件

```typescript
import { authPlugin } from "@dreamer/plugins/auth";

const plugin = authPlugin({
  type: "jwt",
  secret: "your-jwt-secret",
  expiresIn: "7d",
  protectedPaths: ["/api/*", "/admin/*"],
  publicPaths: ["/api/login", "/api/register"],
  roles: {
    admin: ["read", "write", "delete"],
    user: ["read"],
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
import { i18nPlugin, $t, $i18n } from "@dreamer/plugins/i18n";

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

如果你希望在任何文件中不需要 import 就能直接使用 `$t` 和 `$i18n`，可以从本仓库复制 [`src/i18n/global.d.ts`](./src/i18n/global.d.ts) 到你的项目中，然后在 `deno.json` 或 `tsconfig.json` 中引用：

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

### 文件上传插件

```typescript
import { uploadPlugin } from "@dreamer/plugins/upload";

const plugin = uploadPlugin({
  uploadPath: "/api/upload",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".gif"],
  forbiddenExtensions: [".exe", ".bat", ".sh"],
});

// 使用上传服务
const uploadService = container.get("uploadService");
const result = uploadService.validateFile({
  name: "photo.jpg",
  type: "image/jpeg",
  size: 1024 * 500, // 500KB
}, options);

if (result.valid) {
  // 文件有效，可以保存
}
```

### 静态文件插件

```typescript
import { staticPlugin } from "@dreamer/plugins/static";

const plugin = staticPlugin({
  root: "./public",
  prefix: "/static",
  index: ["index.html"],
  dotFiles: "deny",
  etag: true,
  maxAge: 86400,
  mimeTypes: {
    ".wasm": "application/wasm",
  },
});
```

### 安全插件

```typescript
import { securityPlugin, corsPlugin, rateLimitPlugin } from "@dreamer/plugins";

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

## 📚 API 文档

### 插件列表

| 插件 | 导入路径 | 说明 |
|------|---------|------|
| `tailwindPlugin` | `@dreamer/plugins/tailwindcss` | TailwindCSS v4 支持 |
| `unocssPlugin` | `@dreamer/plugins/unocss` | UnoCSS 支持 |
| `i18nPlugin` | `@dreamer/plugins/i18n` | 国际化支持（含全局 $t） |
| `seoPlugin` | `@dreamer/plugins/seo` | SEO 优化 |
| `pwaPlugin` | `@dreamer/plugins/pwa` | PWA 支持 |
| `analyticsPlugin` | `@dreamer/plugins/analytics` | 分析统计 |
| `themePlugin` | `@dreamer/plugins/theme` | 主题切换 |
| `paymentPlugin` | `@dreamer/plugins/payment` | 支付集成 |
| `authPlugin` | `@dreamer/plugins/auth` | 认证授权 |
| `securityPlugin` | `@dreamer/plugins/security` | 安全头 |
| `corsPlugin` | `@dreamer/plugins/cors` | CORS 跨域 |
| `rateLimitPlugin` | `@dreamer/plugins/ratelimit` | 速率限制 |
| `uploadPlugin` | `@dreamer/plugins/upload` | 文件上传 |
| `staticPlugin` | `@dreamer/plugins/static` | 静态文件 |
| `imagePlugin` | `@dreamer/plugins/image` | 图片处理 |
| `captchaPlugin` | `@dreamer/plugins/captcha` | 验证码 |
| `compressionPlugin` | `@dreamer/plugins/compression` | 响应压缩 |
| `notificationPlugin` | `@dreamer/plugins/notification` | 通知推送 |
| `markdownPlugin` | `@dreamer/plugins/markdown` | Markdown 渲染 |
| `socialPlugin` | `@dreamer/plugins/social` | 社交分享/OAuth |

### 支付适配器

| 适配器 | 说明 |
|--------|------|
| `stripe` | Stripe 支付 |
| `paypal` | PayPal 支付 |
| `alipay` | 支付宝 |
| `wechat` | 微信支付 |
| `apple-pay` | Apple Pay |
| `google-pay` | Google Pay |
| `unionpay` | 银联支付 |
| `web3` | Web3/加密货币支付 |

### 客户端模块

| 模块 | 导入路径 | 说明 |
|------|---------|------|
| `I18nClient` | `@dreamer/plugins/i18n/client` | 浏览器端国际化 |
| `ThemeClient` | `@dreamer/plugins/theme/client` | 浏览器端主题管理 |

### 事件钩子

所有插件都实现以下事件钩子（按需）：

| 钩子 | 说明 |
|------|------|
| `onInit` | 初始化时注册服务 |
| `onRequest` | 请求处理前（如语言检测、认证、CSS 编译） |
| `onResponse` | 响应处理后（如注入 meta 标签、压缩、安全头） |
| `onBuildComplete` | 构建完成后（如生成 Sitemap） |

---

## 📊 测试报告

[![Tests](https://img.shields.io/badge/tests-551%20passed-brightgreen)](./TEST_REPORT.md)

| 指标 | 值 |
|------|-----|
| 总测试数 | 551 |
| 通过 | 551 |
| 失败 | 0 |
| 通过率 | 100% |
| 测试时间 | 2026-01-30 |

详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)

---

## 📝 注意事项

1. **依赖关系**：所有插件都依赖 `@dreamer/plugin` 插件管理系统。

2. **事件驱动**：插件通过事件钩子响应应用生命周期，不需要实现 `install`/`activate` 等生命周期方法。

3. **服务注册**：插件在 `onInit` 钩子中注册服务到容器，可通过 `container.get()` 获取。

4. **开发模式**：CSS 插件在开发模式下会实时编译样式，生产模式下使用预编译的 CSS 文件。

5. **配置验证**：所有插件都提供 `validateConfig` 方法验证配置有效性。

6. **客户端模块**：i18n 和 theme 插件提供独立的客户端模块，可直接在浏览器中使用。

7. **全局 $t 方法**：i18n 插件在服务端和客户端都支持全局 `$t` 方法，使用 `getGlobalT()` 或 `getGlobalI18n()` 获取。

8. **支付安全**：支付插件的密钥应通过环境变量配置，不要硬编码在代码中。

9. **JSR 兼容**：所有模块都使用类型安全的方式处理全局变量，确保 JSR 发布兼容性。

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
