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
 * 翻译参数类型
 */
export type TranslationParams = Record<string, string | number>;

/**
 * 翻译文件数据结构
 */
export interface TranslationData {
  [key: string]: string | TranslationData;
}

/**
 * I18n 服务接口
 */
export interface I18nService {
  /** 翻译函数 */
  t: (key: string, params?: TranslationParams) => string;
  /** 获取当前语言 */
  getLocale: () => string;
  /** 设置语言 */
  setLocale: (locale: string) => void;
  /** 获取支持的语言列表 */
  getLocales: () => string[];
  /** 检查语言是否支持 */
  isLocaleSupported: (locale: string) => boolean;
  /** 加载翻译数据 */
  loadTranslations: (locale: string, data: TranslationData) => void;
  /** 获取所有翻译数据 */
  getTranslations: (locale?: string) => TranslationData;
}

/**
 * 全局 $t 函数类型
 */
export type GlobalTranslateFunction = (
  key: string,
  params?: TranslationParams,
) => string;

/**
 * 全局对象类型（用于类型安全的 globalThis 访问）
 */
interface GlobalI18n {
  $t?: GlobalTranslateFunction;
  $i18n?: I18nService;
}

/**
 * 获取全局对象引用（类型安全）
 */
const getGlobalRef = (): GlobalI18n => {
  return globalThis as unknown as GlobalI18n;
};

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

  // 翻译数据存储
  const translations: Record<string, TranslationData> = {};

  /**
   * 从嵌套对象中获取翻译值
   * @param data - 翻译数据
   * @param key - 键路径（支持点分隔，如 "common.greeting"）
   * @returns 翻译值或 undefined
   */
  const getNestedValue = (
    data: TranslationData,
    key: string,
  ): string | undefined => {
    const keys = key.split(".");
    // deno-lint-ignore no-explicit-any
    let current: any = data;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return typeof current === "string" ? current : undefined;
  };

  /**
   * 替换翻译字符串中的参数
   * @param text - 翻译文本
   * @param params - 参数对象
   * @returns 替换后的文本
   */
  const interpolate = (
    text: string,
    params?: TranslationParams,
  ): string => {
    if (!params) return text;

    return text.replace(/\{(\w+)\}/g, (_, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : `{${key}}`;
    });
  };

  /**
   * 翻译函数实现
   * @param key - 翻译键
   * @param params - 替换参数
   * @returns 翻译后的文本
   */
  const translate = (key: string, params?: TranslationParams): string => {
    // 尝试从当前语言获取翻译
    const localeData = translations[currentLocale];
    if (localeData) {
      const value = getNestedValue(localeData, key);
      if (value) {
        return interpolate(value, params);
      }
    }

    // 尝试从默认语言获取翻译
    if (currentLocale !== defaultLocale) {
      const defaultData = translations[defaultLocale];
      if (defaultData) {
        const value = getNestedValue(defaultData, key);
        if (value) {
          return interpolate(value, params);
        }
      }
    }

    // 返回原始 key
    return key;
  };

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

      // 创建 i18n 服务实例
      const i18nService: I18nService = {
        /**
         * 翻译函数
         * @param key - 翻译键（支持点分隔路径，如 "common.greeting"）
         * @param params - 替换参数
         * @returns 翻译后的文本
         */
        t: translate,

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

        /**
         * 加载翻译数据
         * @param locale - 语言代码
         * @param data - 翻译数据
         */
        loadTranslations: (locale: string, data: TranslationData) => {
          translations[locale] = { ...translations[locale], ...data };
        },

        /**
         * 获取所有翻译数据
         * @param locale - 语言代码（可选，默认返回当前语言）
         */
        getTranslations: (locale?: string) => {
          return translations[locale || currentLocale] || {};
        },
      };

      // 注册翻译服务
      container.registerSingleton("i18nService", () => i18nService);

      // 注册全局 $t 函数和 $i18n 实例
      const g = getGlobalRef();
      g.$t = translate;
      g.$i18n = i18nService;

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

/**
 * 卸载全局翻译方法
 *
 * 从全局对象移除 $t 和 $i18n
 *
 * @example
 * ```typescript
 * import { uninstallI18n } from "@dreamer/plugins/i18n";
 *
 * uninstallI18n();
 * ```
 */
export function uninstallI18n(): void {
  const g = getGlobalRef();
  g.$t = undefined;
  g.$i18n = undefined;
}

/**
 * 检查 i18n 是否已安装
 *
 * @returns 是否已安装
 */
export function isI18nInstalled(): boolean {
  return typeof getGlobalRef().$t === "function";
}

/**
 * 获取全局 i18n 服务实例
 *
 * @returns I18nService 实例或 undefined
 */
export function getGlobalI18n(): I18nService | undefined {
  return getGlobalRef().$i18n;
}

/**
 * 获取全局翻译函数
 *
 * @returns 翻译函数或 undefined
 */
export function getGlobalT(): GlobalTranslateFunction | undefined {
  return getGlobalRef().$t;
}

/**
 * 全局翻译函数（便捷导出）
 *
 * 使用前需要先初始化 i18n 插件
 *
 * @example
 * ```typescript
 * import { $t } from "@dreamer/plugins/i18n";
 *
 * // 在插件初始化后使用
 * const greeting = $t("greeting");
 * const hello = $t("hello", { name: "张三" });
 * ```
 */
export const $t: GlobalTranslateFunction = (
  key: string,
  params?: TranslationParams,
): string => {
  const g = getGlobalRef();
  if (!g.$t) {
    console.warn("[i18n] 请先初始化 i18n 插件");
    return key;
  }
  return g.$t(key, params);
};

/**
 * 全局 i18n 服务代理对象（便捷导出）
 *
 * 使用前需要先初始化 i18n 插件
 *
 * @example
 * ```typescript
 * import { $i18n } from "@dreamer/plugins/i18n";
 *
 * // 在插件初始化后使用
 * $i18n.setLocale("en-US");
 * $i18n.loadTranslations("zh-CN", { hello: "你好" });
 * console.log($i18n.getLocale()); // "en-US"
 * ```
 */
export const $i18n: I18nService = {
  /**
   * 翻译函数
   * @param key - 翻译键
   * @param params - 插值参数
   * @returns 翻译结果
   */
  t: (key: string, params?: TranslationParams): string => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      console.warn("[i18n] 请先初始化 i18n 插件");
      return key;
    }
    return g.$i18n.t(key, params);
  },

  /**
   * 获取当前语言
   * @returns 当前语言代码
   */
  getLocale: (): string => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      console.warn("[i18n] 请先初始化 i18n 插件");
      return "zh-CN";
    }
    return g.$i18n.getLocale();
  },

  /**
   * 设置当前语言
   * @param locale - 语言代码
   */
  setLocale: (locale: string): void => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      console.warn("[i18n] 请先初始化 i18n 插件");
      return;
    }
    g.$i18n.setLocale(locale);
  },

  /**
   * 获取支持的语言列表
   * @returns 语言代码数组
   */
  getLocales: (): string[] => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      console.warn("[i18n] 请先初始化 i18n 插件");
      return [];
    }
    return g.$i18n.getLocales();
  },

  /**
   * 检查语言是否支持
   * @param locale - 语言代码
   * @returns 是否支持
   */
  isLocaleSupported: (locale: string): boolean => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      return false;
    }
    return g.$i18n.isLocaleSupported(locale);
  },

  /**
   * 加载翻译数据
   * @param locale - 语言代码
   * @param data - 翻译数据
   */
  loadTranslations: (locale: string, data: TranslationData): void => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      console.warn("[i18n] 请先初始化 i18n 插件");
      return;
    }
    g.$i18n.loadTranslations(locale, data);
  },

  /**
   * 获取翻译数据
   * @param locale - 语言代码（可选，默认当前语言）
   * @returns 翻译数据
   */
  getTranslations: (locale?: string): TranslationData => {
    const g = getGlobalRef();
    if (!g.$i18n) {
      return {};
    }
    return g.$i18n.getTranslations(locale);
  },
};

// 默认导出
export default i18nPlugin;
