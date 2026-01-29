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
export { unocssPlugin, type UnoCSSPluginOptions } from "./unocss/mod.ts";

// 功能插件
export {
  analyticsPlugin,
  type AnalyticsPluginOptions,
} from "./analytics/mod.ts";
export { i18nPlugin, type I18nPluginOptions } from "./i18n/mod.ts";
export { pwaPlugin, type PWAPluginOptions } from "./pwa/mod.ts";
export { seoPlugin, type SEOPluginOptions } from "./seo/mod.ts";
export {
  themePlugin,
  type ThemePluginOptions,
  type ThemeMode,
  type ThemeColors,
  type ThemeDefinition,
} from "./theme/mod.ts";
