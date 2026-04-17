/**
 * @module @dreamer/plugins
 *
 * dweb 框架的官方插件集合
 *
 * 提供常用的功能插件，包括 CSS 处理、国际化、SEO、PWA、分析统计等。
 *
 * 设计原则：
 * - 所有插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

// CSS 处理插件
export {
  tailwindPlugin,
  type TailwindPluginOptions,
} from "./tailwindcss/mod.ts";
export {
  unocssPlugin,
  type UnoCSSPluginOptions,
  type UnoCSSPresetItem,
} from "./unocss/mod.ts";

// 功能插件
export {
  analyticsPlugin,
  type AnalyticsPluginOptions,
} from "./analytics/mod.ts";
export { i18nPlugin, type I18nPluginOptions } from "./i18n/mod.ts";
export { pwaPlugin, type PWAPluginOptions } from "./pwa/mod.ts";
export { seoPlugin, type SEOPluginOptions } from "./seo/mod.ts";
export {
  type DarkModeStrategy,
  type ThemeMode,
  themePlugin,
  type ThemePluginOptions,
} from "./theme/mod.ts";

// 基础设施与安全插件
export {
  compressionPlugin,
  type CompressionPluginOptions,
} from "./compression/mod.ts";
export { corsPlugin, type CorsPluginOptions } from "./cors/mod.ts";
export {
  rateLimitPlugin,
  type RateLimitPluginOptions,
} from "./ratelimit/mod.ts";
export {
  type CspDirectives,
  securityPlugin,
  type SecurityPluginOptions,
} from "./security/mod.ts";
export { authPlugin, type AuthPluginOptions } from "./auth/mod.ts";

// 静态与社交插件
export {
  type StaticDirectory,
  staticPlugin,
  type StaticPluginOptions,
} from "./static/mod.ts";
export {
  type OAuthConfig,
  type OAuthProvider,
  type OAuthUser,
  type ShareContent,
  type SocialPlatform,
  socialPlugin,
  type SocialPluginOptions,
} from "./social/mod.ts";

// 计划任务（Cron）
export {
  scheduledPlugin,
  type ScheduledTaskCommandEntry,
  type ScheduledTaskEntry,
  type ScheduledTaskScriptEntry,
} from "./scheduled/mod.ts";

// 队列（@dreamer/queue）
export {
  queuePlugin,
  type QueuePluginOptions,
  type QueuePluginQueueEntry,
} from "./queue/mod.ts";
