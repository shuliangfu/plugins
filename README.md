# @dreamer/plugins

> 一个兼容 Deno 和 Bun 的官方插件集合，提供 CSS 原子化、国际化、SEO、PWA、数据分析、主题切换等开箱即用的 Web 应用功能插件

[![JSR](https://jsr.io/badges/@dreamer/plugins)](https://jsr.io/@dreamer/plugins)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/tests-224%20passed-brightgreen)](./TEST_REPORT.md)

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

- **CSS 处理插件**：
  - TailwindCSS v4 支持（自动配置、热重载、生产优化）
  - UnoCSS 支持（预设系统、图标支持、高性能构建）

- **国际化插件（i18n）**：
  - 多语言检测和切换
  - 翻译文件管理
  - 路由本地化
  - 日期和数字格式化
  - **客户端模块**：提供浏览器端翻译函数（全局 `$t` 方法）

- **SEO 优化插件**：
  - 自动生成 meta 标签
  - Sitemap 和 Robots.txt 生成
  - Open Graph 和 Twitter Card 支持
  - 结构化数据（JSON-LD）

- **PWA 插件**：
  - Service Worker 注册
  - Web App Manifest 生成
  - 离线支持
  - 推送通知

- **分析统计插件**：
  - Google Analytics 集成
  - 自定义事件追踪
  - 性能监控
  - 用户行为分析

- **主题插件（Theme）**：
  - 亮色/暗色/系统模式切换
  - 自定义主题支持
  - CSS 变量注入
  - Cookie 持久化
  - **客户端模块**：提供浏览器端主题管理

---

## 🎯 使用场景

- **现代 CSS 开发**：使用 TailwindCSS 或 UnoCSS 进行原子化 CSS 开发
- **多语言应用**：构建支持多种语言的国际化应用
- **SEO 优化**：提升搜索引擎排名和社交媒体分享效果
- **PWA 应用**：构建可安装的渐进式 Web 应用
- **数据分析**：追踪用户行为和应用性能
- **主题切换**：支持亮色/暗色模式和自定义主题

---

## 💡 适用场景

**什么时候应该使用 @dreamer/plugins**：

- ✅ 使用 dweb 框架构建 Web 应用
- ✅ 需要快速集成常用功能（CSS、i18n、SEO、PWA、Analytics、Theme）
- ✅ 希望使用统一的插件管理方式
- ✅ 需要服务端渲染的功能增强
- ✅ 需要客户端国际化或主题管理

**什么时候不适用**：

- ❌ 非 dweb 框架项目（需要自行实现 PluginManager 集成）

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
import { tailwindPlugin, pwaPlugin, analyticsPlugin, themePlugin } from "@dreamer/plugins";

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
  ],
});

await app.start();
```

---

## 🎨 使用示例

### CSS 处理插件

#### TailwindCSS v4

```typescript
import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";

// 基础用法（无需配置文件）
const plugin = tailwindPlugin({
  content: ["./src/**/*.{ts,tsx}"],
});

// 高级用法（使用配置文件）
const plugin = tailwindPlugin({
  config: "./tailwind.config.ts",
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
});

await pluginManager.use(plugin);
```

#### UnoCSS

```typescript
import { unocssPlugin } from "@dreamer/plugins/unocss";

// 基础用法
const plugin = unocssPlugin({
  content: ["./src/**/*.{ts,tsx}"],
  icons: true,
});

// 高级用法
const plugin = unocssPlugin({
  config: "./uno.config.ts",
  presets: ["@unocss/preset-wind", "@unocss/preset-icons"],
  shortcuts: {
    "btn": "px-4 py-2 rounded bg-blue-500 text-white",
  },
});

await pluginManager.use(plugin);
```

### 国际化插件

```typescript
import { i18nPlugin } from "@dreamer/plugins/i18n";

const plugin = i18nPlugin({
  defaultLocale: "zh-CN",
  locales: ["zh-CN", "en-US", "ja-JP"],
  detectLanguage: true,
  detectMethods: ["header", "cookie", "query"],
  routeLocalization: true,
});

await pluginManager.use(plugin);
```

#### i18n 客户端模块

```typescript
import { createI18nClient, installI18n } from "@dreamer/plugins/i18n/client";

// 创建客户端实例
const i18n = createI18nClient({
  defaultLocale: "zh-CN",
  supportedLocales: ["zh-CN", "en-US"],
  translations: {
    "zh-CN": { hello: "你好", welcome: "欢迎 {name}" },
    "en-US": { hello: "Hello", welcome: "Welcome {name}" },
  },
});

// 使用翻译
console.log(i18n.t("hello")); // "你好"
console.log(i18n.t("welcome", { name: "张三" })); // "欢迎 张三"

// 安装全局 $t 方法
installI18n(i18n);

// 然后可以在任何地方使用
console.log($t("hello")); // "你好"
```

### 主题插件

```typescript
import { themePlugin } from "@dreamer/plugins/theme";

const plugin = themePlugin({
  defaultMode: "system", // "light" | "dark" | "system"
  cookieName: "theme",
  cookieExpireDays: 365,
  htmlAttribute: "data-theme",
  cssVarPrefix: "theme",
  themes: {
    light: {
      "color-primary": "#3b82f6",
      "color-background": "#ffffff",
      "color-text": "#1f2937",
    },
    dark: {
      "color-primary": "#60a5fa",
      "color-background": "#1f2937",
      "color-text": "#f9fafb",
    },
  },
});

await pluginManager.use(plugin);
```

#### Theme 客户端模块

```typescript
import { createThemeClient } from "@dreamer/plugins/theme/client";

// 创建客户端实例
const theme = createThemeClient({
  cookieName: "theme",
  defaultMode: "system",
});

// 获取当前主题
console.log(theme.current); // "light" | "dark" | 自定义主题名
console.log(theme.mode);    // "light" | "dark" | "system"

// 切换主题
theme.toggle();      // 在 light 和 dark 之间切换
theme.setLight();    // 设置为亮色
theme.setDark();     // 设置为暗色
theme.setSystem();   // 跟随系统

// 监听主题变化
theme.onChange((newTheme, mode) => {
  console.log(`主题已切换到: ${newTheme}, 模式: ${mode}`);
});

// CSS 变量操作
const primaryColor = theme.getCssVar("color-primary");
theme.setCssVar("color-primary", "#ff0000");
```

### SEO 优化插件

```typescript
import { seoPlugin } from "@dreamer/plugins/seo";

const plugin = seoPlugin({
  title: "My Website",
  description: "A great website for everyone",
  siteUrl: "https://example.com",
  keywords: ["web", "app", "deno"],
  openGraph: {
    siteName: "My Website",
    image: "https://example.com/og-image.png",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    username: "mywebsite",
  },
  generateSitemap: true,
  generateRobots: true,
});

await pluginManager.use(plugin);
```

### PWA 插件

```typescript
import { pwaPlugin } from "@dreamer/plugins/pwa";

const plugin = pwaPlugin({
  name: "My Progressive Web App",
  shortName: "MyPWA",
  description: "An awesome PWA",
  themeColor: "#3498db",
  backgroundColor: "#ffffff",
  display: "standalone",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  offlineSupport: true,
  cacheStrategy: "networkFirst",
  pushNotifications: true,
});

await pluginManager.use(plugin);
```

### 分析统计插件

```typescript
import { analyticsPlugin } from "@dreamer/plugins/analytics";

const plugin = analyticsPlugin({
  ga4Id: "G-XXXXXXXXXX",
  trackPageviews: true,
  trackEvents: true,
  trackPerformance: true,
  disableInDev: true,
  otherServices: [
    { name: "plausible", id: "example.com" },
  ],
});

await pluginManager.use(plugin);
```

---

## 📚 API 文档

### 插件列表

| 插件 | 导入路径 | 说明 |
|------|---------|------|
| `tailwindPlugin` | `@dreamer/plugins/tailwindcss` | TailwindCSS v4 支持 |
| `unocssPlugin` | `@dreamer/plugins/unocss` | UnoCSS 支持 |
| `i18nPlugin` | `@dreamer/plugins/i18n` | 国际化支持 |
| `seoPlugin` | `@dreamer/plugins/seo` | SEO 优化 |
| `pwaPlugin` | `@dreamer/plugins/pwa` | PWA 支持 |
| `analyticsPlugin` | `@dreamer/plugins/analytics` | 分析统计 |
| `themePlugin` | `@dreamer/plugins/theme` | 主题切换 |

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
| `onRequest` | 请求处理前（如语言检测、CSS 编译、主题读取） |
| `onResponse` | 响应处理后（如注入 meta 标签、CSS 样式、主题脚本） |
| `onBuildComplete` | 构建完成后（如生成 Sitemap） |

---

## 📊 测试报告

[![Tests](https://img.shields.io/badge/tests-224%20passed-brightgreen)](./TEST_REPORT.md)

| 指标 | 值 |
|------|-----|
| 总测试数 | 224 |
| 通过 | 224 |
| 失败 | 0 |
| 通过率 | 100% |
| 测试时间 | 2026-01-30 |

### 测试覆盖

| 测试文件 | 测试数量 | 状态 |
|----------|----------|------|
| analytics.test.ts | 24 | ✅ |
| i18n.test.ts | 21 | ✅ |
| i18n-client.test.ts | 50 | ✅ |
| mod.test.ts | 36 | ✅ |
| pwa.test.ts | 18 | ✅ |
| seo.test.ts | 23 | ✅ |
| tailwindcss.test.ts | 14 | ✅ |
| theme-client.test.ts | 21 | ✅ |
| unocss.test.ts | 17 | ✅ |

详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)

---

## 📝 注意事项

1. **依赖关系**：所有插件都依赖 `@dreamer/plugin` 插件管理系统。

2. **事件驱动**：插件通过事件钩子响应应用生命周期，不需要实现 `install`/`activate` 等生命周期方法。

3. **服务注册**：插件在 `onInit` 钩子中注册服务到容器，可通过 `container.get()` 获取。

4. **开发模式**：CSS 插件在开发模式下会实时编译样式，生产模式下使用预编译的 CSS 文件。

5. **配置验证**：所有插件都提供 `validateConfig` 方法验证配置有效性。

6. **客户端模块**：i18n 和 theme 插件提供独立的客户端模块，可直接在浏览器中使用，无需依赖服务端插件。

7. **JSR 兼容**：客户端模块使用类型断言方式处理 DOM 类型，确保 JSR 发布兼容性。

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
