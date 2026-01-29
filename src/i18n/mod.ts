/**
 * @module @dreamer/plugins/i18n
 *
 * 国际化（i18n）插件
 *
 * 提供多语言支持，包括：
 * - 语言检测和切换
 * - 翻译文件管理
 * - 路由本地化
 * - 日期和数字格式化
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

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
  } = options;

  // 当前语言（运行时状态）
  let currentLocale = defaultLocale;

  return {
    name: "@dreamer/plugins-i18n",
    version: "0.1.0",

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
     * 注册 i18n 服务到容器
     */
    onInit(container: ServiceContainer) {
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
      }));

      // 注册翻译服务
      container.registerSingleton("i18nService", () => ({
        /**
         * 翻译函数
         */
        t: (key: string, _params?: Record<string, unknown>) => {
          // 翻译实现（实际应该从翻译文件加载）
          return key;
        },
        /**
         * 获取当前语言
         */
        getLocale: () => currentLocale,
        /**
         * 设置语言
         */
        setLocale: (locale: string) => {
          if (locales.includes(locale)) {
            currentLocale = locale;
          }
        },
        /**
         * 获取支持的语言列表
         */
        getLocales: () => locales,
        /**
         * 检查语言是否支持
         */
        isLocaleSupported: (locale: string) => locales.includes(locale),
      }));

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
    onRequest(ctx: RequestContext, container: ServiceContainer) {
      // 如果未启用语言检测，跳过
      if (!detectLanguage) {
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

      // 更新 i18n 服务
      const i18nService = container.get<{
        setLocale: (locale: string) => void;
      }>("i18nService");
      if (i18nService) {
        i18nService.setLocale(detectedLocale);
      }
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
