/**
 * @module @dreamer/plugins/i18n
 *
 * 国际化（i18n）插件
 *
 * 基于 @dreamer/i18n 库，提供插件级别的多语言支持，包括：
 * - 语言检测和切换
 * - 翻译文件管理
 * - 路由本地化
 * - 请求/响应语言处理
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 * - 核心 i18n 功能由 @dreamer/i18n 库提供
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import {
  createI18n,
  type I18n,
  type I18nOptions,
  type I18nService,
  type TranslationData,
} from "@dreamer/i18n";

// 从 @dreamer/i18n 重新导出类型和工具函数
export type {
  DateFormatOptions,
  GlobalI18n,
  GlobalTranslateFunction,
  I18nOptions,
  I18nService,
  LocaleChangeCallback,
  NumberFormatOptions,
  TranslationData,
  TranslationParams,
} from "@dreamer/i18n";

export {
  $i18n,
  $t,
  createI18n,
  getGlobalI18n,
  getI18n,
  I18n,
  isI18nInstalled,
  setDefaultI18n,
  uninstallI18n,
} from "@dreamer/i18n";

/**
 * i18n 插件配置选项
 */
export interface I18nPluginOptions {
  /** 默认语言（默认："zh-CN"） */
  defaultLocale?: string;
  /** 支持的语言列表（默认：["zh-CN", "en-US"]） */
  locales?: string[];
  /** 翻译文件目录（默认："./src/locales"） */
  localesDir?: string;
  /** 翻译文件格式（默认："json"） */
  format?: "json" | "yaml" | "ts";
  /** 是否启用路由本地化（默认：true） */
  routeLocalization?: boolean;
  /** 路由前缀模式（默认："/:locale"） */
  routePrefix?: string;
  /** 是否启用语言检测（默认：true） */
  detectLanguage?: boolean;
  /** 语言检测方式（默认：["header", "cookie", "query"]） */
  detectMethods?: Array<"header" | "cookie" | "query" | "path">;
  /** Cookie 名称（默认："locale"） */
  cookieName?: string;
  /** Query 参数名称（默认："lang"） */
  queryName?: string;
  /** 初始翻译数据 */
  translations?: Record<string, TranslationData>;
  /** 日期格式化选项 */
  dateFormat?: {
    /** 日期格式（默认："YYYY-MM-DD"） */
    date?: string;
    /** 时间格式（默认："HH:mm:ss"） */
    time?: string;
    /** 日期时间格式（默认："YYYY-MM-DD HH:mm:ss"） */
    datetime?: string;
  };
  /** 数字格式化选项 */
  numberFormat?: {
    /** 小数位数（默认：2） */
    decimals?: number;
    /** 千位分隔符（默认：","） */
    thousandsSeparator?: string;
    /** 小数分隔符（默认："."） */
    decimalSeparator?: string;
  };
  /** 缺失翻译时的回退行为 */
  fallbackBehavior?: "key" | "empty" | "default";
  /** 是否启用 HTML 转义（安全防护，防止 XSS） */
  escapeHtml?: boolean;
}

/**
 * 创建 i18n 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { i18nPlugin } from "@dreamer/plugins/i18n";
 *
 * const plugin = i18nPlugin({
 *   defaultLocale: "zh-CN",
 *   locales: ["zh-CN", "en-US", "ja-JP"],
 *   detectLanguage: true,
 *   translations: {
 *     "zh-CN": { greeting: "你好" },
 *     "en-US": { greeting: "Hello" }
 *   }
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function i18nPlugin(options: I18nPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    defaultLocale = "zh-CN",
    locales = ["zh-CN", "en-US"],
    localesDir = "./src/locales",
    format = "json",
    routeLocalization = true,
    routePrefix = "/:locale",
    detectLanguage = true,
    detectMethods = ["header", "cookie", "query"],
    cookieName = "locale",
    queryName = "lang",
    translations = {},
    dateFormat = {
      date: "YYYY-MM-DD",
      time: "HH:mm:ss",
      datetime: "YYYY-MM-DD HH:mm:ss",
    },
    numberFormat = {
      decimals: 2,
      thousandsSeparator: ",",
      decimalSeparator: ".",
    },
    fallbackBehavior = "key",
    escapeHtml = false,
  } = options;

  // I18n 实例（在 onInit 中创建）
  let i18nInstance: I18n | null = null;

  return {
    name: "@dreamer/plugins-i18n",
    version: "1.0.0",

    // 插件配置
    config: {
      i18n: {
        defaultLocale,
        locales,
        localesDir,
        format,
        routeLocalization,
        routePrefix,
        detectLanguage,
        detectMethods,
        cookieName,
        queryName,
        dateFormat,
        numberFormat,
        fallbackBehavior,
        escapeHtml,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.i18n && typeof config.i18n === "object") {
        const i18n = config.i18n as Record<string, unknown>;
        if (i18n.locales && !Array.isArray(i18n.locales)) {
          return false;
        }
        if (i18n.detectMethods && !Array.isArray(i18n.detectMethods)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 创建 I18n 实例并注册到容器
     */
    onInit(container: ServiceContainer) {
      // 创建 I18n 实例（使用 @dreamer/i18n 库）
      const i18nOptions: I18nOptions = {
        defaultLocale,
        locales,
        translations,
        dateFormat,
        numberFormat,
        fallbackBehavior,
        escapeHtml,
      };

      i18nInstance = createI18n(i18nOptions);

      // 安装到全局对象（注册 $t 和 $i18n）
      i18nInstance.install();

      // 注册 i18n 配置服务
      container.registerSingleton("i18nConfig", () => ({
        defaultLocale,
        locales,
        localesDir,
        format,
        routeLocalization,
        routePrefix,
        detectLanguage,
        detectMethods,
        cookieName,
        queryName,
        dateFormat,
        numberFormat,
        fallbackBehavior,
        escapeHtml,
      }));

      // 注册 i18n 服务实例
      container.registerSingleton<I18nService>("i18nService", () => i18nInstance!);

      // 输出日志（logger 可能不存在）
      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;
      if (logger) {
        logger.info(`i18n 插件已初始化，支持语言: ${locales.join(", ")}`);
      }
    },

    /**
     * 请求处理前钩子
     * 检测并设置语言
     */
    onRequest(ctx: RequestContext, _container: ServiceContainer) {
      // 如果未启用语言检测，跳过
      if (!detectLanguage || !i18nInstance) {
        return;
      }

      let detectedLocale = defaultLocale;

      // 按配置的检测方式检测语言
      for (const method of detectMethods) {
        if (method === "header") {
          // 从 Accept-Language 头检测
          const acceptLanguage = ctx.headers.get("accept-language");
          if (acceptLanguage) {
            const lang = acceptLanguage.split(",")[0].split("-")[0];
            const matched = locales.find((l) => l.startsWith(lang));
            if (matched) {
              detectedLocale = matched;
              break;
            }
          }
        } else if (method === "cookie") {
          // 从 Cookie 检测（需要类型断言）
          const cookies = ctx.cookies as {
            get?: (name: string) => string | undefined;
          } | undefined;
          const cookieValue = cookies?.get?.(cookieName);
          if (cookieValue && locales.includes(cookieValue)) {
            detectedLocale = cookieValue;
            break;
          }
        } else if (method === "query") {
          // 从 Query 参数检测
          const queryValue = ctx.query?.[queryName];
          if (queryValue && locales.includes(queryValue)) {
            detectedLocale = queryValue;
            break;
          }
        } else if (method === "path") {
          // 从路径检测（如 /en-US/page）
          const pathMatch = ctx.path.match(/^\/([^/]+)/);
          if (pathMatch && locales.includes(pathMatch[1])) {
            detectedLocale = pathMatch[1];
            break;
          }
        }
      }

      // 将检测到的语言存储到上下文
      (ctx as Record<string, unknown>).locale = detectedLocale;

      // 更新 i18n 服务的当前语言
      i18nInstance.setLocale(detectedLocale);
    },

    /**
     * 响应处理后钩子
     * 设置响应头和注入语言属性
     */
    async onResponse(ctx: RequestContext) {
      // 获取当前语言
      const locale = (ctx as Record<string, unknown>).locale as string ||
        defaultLocale;

      // 设置响应头
      if (ctx.response) {
        const headers = new Headers(ctx.response.headers);
        headers.set("Content-Language", locale);
        headers.set("X-Locale", locale);

        ctx.response = new Response(ctx.response.body, {
          status: ctx.response.status,
          statusText: ctx.response.statusText,
          headers,
        });
      }

      // 如果是 HTML 响应，注入语言属性
      const contentType = ctx.response?.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        try {
          const html = await ctx.response!.text();
          // 在 <html> 标签中添加 lang 属性
          const injectedHtml = html.replace(
            /<html([^>]*)>/i,
            (match, attrs) => {
              if (attrs.includes("lang=")) {
                return match.replace(/lang="[^"]*"/i, `lang="${locale}"`);
              }
              return `<html${attrs} lang="${locale}">`;
            },
          );

          ctx.response = new Response(injectedHtml, {
            status: ctx.response!.status,
            statusText: ctx.response!.statusText,
            headers: ctx.response!.headers,
          });
        } catch {
          // 如果处理失败，忽略错误
        }
      }
    },
  };
}

// 默认导出
export default i18nPlugin;
