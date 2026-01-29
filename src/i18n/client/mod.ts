/**
 * i18n 国际化插件客户端模块
 *
 * 提供浏览器端国际化功能，包括：
 * - 获取/设置当前语言
 * - 翻译函数（t）
 * - 数字/日期格式化
 * - 监听语言变化
 *
 * @module
 */

/**
 * DOM 相关类型定义（用于浏览器环境）
 */
interface BrowserDocument {
  cookie: string;
  documentElement: {
    setAttribute: (name: string, value: string) => void;
  };
}

interface BrowserNavigator {
  language?: string;
  userLanguage?: string;
}

interface BrowserWindow {
  document?: BrowserDocument;
  navigator?: BrowserNavigator;
}

/**
 * 获取浏览器全局对象
 */
function getBrowserGlobal(): BrowserWindow {
  return globalThis as unknown as BrowserWindow;
}

/**
 * 翻译参数类型
 */
export type TranslationParams = Record<string, string | number>;

/**
 * 翻译数据类型（嵌套对象）
 */
export type TranslationData = {
  [key: string]: string | TranslationData;
};

/**
 * 语言变化事件回调
 */
export type LocaleChangeCallback = (locale: string) => void;

/**
 * 日期格式化选项
 */
export interface DateFormatOptions {
  /** 日期格式 */
  date?: string;
  /** 时间格式 */
  time?: string;
  /** 日期时间格式 */
  datetime?: string;
}

/**
 * 数字格式化选项
 */
export interface NumberFormatOptions {
  /** 小数位数 */
  decimals?: number;
  /** 千位分隔符 */
  thousandsSeparator?: string;
  /** 小数分隔符 */
  decimalSeparator?: string;
}

/**
 * i18n 客户端配置选项
 */
export interface I18nClientOptions {
  /** 默认语言（默认："zh-CN"） */
  defaultLocale?: string;
  /** 支持的语言列表 */
  locales?: string[];
  /** Cookie 名称（默认："locale"） */
  cookieName?: string;
  /** Cookie 过期时间（天，默认：365） */
  cookieExpireDays?: number;
  /** 初始翻译数据 */
  translations?: Record<string, TranslationData>;
  /** 日期格式化选项 */
  dateFormat?: DateFormatOptions;
  /** 数字格式化选项 */
  numberFormat?: NumberFormatOptions;
  /** 缺失翻译时的回退行为 */
  fallbackBehavior?: "key" | "empty" | "default";
}

/**
 * i18n 客户端类
 *
 * 在浏览器端管理国际化功能
 *
 * @example
 * ```typescript
 * import { I18nClient } from "@dreamer/plugins/i18n/client";
 *
 * const i18n = new I18nClient({
 *   defaultLocale: "zh-CN",
 *   locales: ["zh-CN", "en-US"],
 *   translations: {
 *     "zh-CN": {
 *       greeting: "你好，{name}！",
 *       nav: { home: "首页", about: "关于" }
 *     },
 *     "en-US": {
 *       greeting: "Hello, {name}!",
 *       nav: { home: "Home", about: "About" }
 *     }
 *   }
 * });
 *
 * // 翻译
 * i18n.t("greeting", { name: "张三" }); // "你好，张三！"
 * i18n.t("nav.home"); // "首页"
 *
 * // 切换语言
 * i18n.setLocale("en-US");
 * i18n.t("greeting", { name: "John" }); // "Hello, John!"
 * ```
 */
export class I18nClient {
  /** 当前语言 */
  private currentLocale: string;
  /** 支持的语言列表 */
  private locales: string[];
  /** Cookie 名称 */
  private cookieName: string;
  /** Cookie 过期时间（天） */
  private cookieExpireDays: number;
  /** 翻译数据 */
  private translations: Record<string, TranslationData>;
  /** 日期格式化选项 */
  private dateFormat: DateFormatOptions;
  /** 数字格式化选项 */
  private numberFormat: NumberFormatOptions;
  /** 缺失翻译时的回退行为 */
  private fallbackBehavior: "key" | "empty" | "default";
  /** 语言变化回调列表 */
  private callbacks: Set<LocaleChangeCallback> = new Set();

  /**
   * 创建 i18n 客户端实例
   *
   * @param options - 配置选项
   */
  constructor(options: I18nClientOptions = {}) {
    this.locales = options.locales ?? ["zh-CN", "en-US"];
    this.cookieName = options.cookieName ?? "locale";
    this.cookieExpireDays = options.cookieExpireDays ?? 365;
    this.translations = options.translations ?? {};
    this.fallbackBehavior = options.fallbackBehavior ?? "key";

    this.dateFormat = {
      date: options.dateFormat?.date ?? "YYYY-MM-DD",
      time: options.dateFormat?.time ?? "HH:mm:ss",
      datetime: options.dateFormat?.datetime ?? "YYYY-MM-DD HH:mm:ss",
    };

    this.numberFormat = {
      decimals: options.numberFormat?.decimals ?? 2,
      thousandsSeparator: options.numberFormat?.thousandsSeparator ?? ",",
      decimalSeparator: options.numberFormat?.decimalSeparator ?? ".",
    };

    // 初始化当前语言
    const savedLocale = this.getSavedLocale();
    const detectedLocale = this.detectBrowserLocale();
    const defaultLocale = options.defaultLocale ?? "zh-CN";

    this.currentLocale = savedLocale ?? detectedLocale ?? defaultLocale;

    // 确保语言在支持列表中
    if (!this.locales.includes(this.currentLocale)) {
      this.currentLocale = defaultLocale;
    }
  }

  /**
   * 检测浏览器语言
   *
   * @returns 检测到的语言，未检测到返回 null
   */
  private detectBrowserLocale(): string | null {
    const g = getBrowserGlobal();
    if (!g.navigator) {
      return null;
    }

    const browserLang = g.navigator.language || g.navigator.userLanguage;

    if (!browserLang) {
      return null;
    }

    // 尝试精确匹配
    if (this.locales.includes(browserLang)) {
      return browserLang;
    }

    // 尝试语言代码匹配（如 "zh" 匹配 "zh-CN"）
    const langCode = browserLang.split("-")[0];
    const matched = this.locales.find((locale) =>
      locale.startsWith(langCode + "-")
    );

    return matched ?? null;
  }

  /**
   * 获取保存的语言
   *
   * @returns 保存的语言，未保存返回 null
   */
  private getSavedLocale(): string | null {
    const g = getBrowserGlobal();
    if (!g.document) {
      return null;
    }
    const match = g.document.cookie.match(
      new RegExp("(^| )" + this.cookieName + "=([^;]+)"),
    );
    return match ? match[2] : null;
  }

  /**
   * 保存语言到 Cookie
   *
   * @param locale - 要保存的语言
   */
  private saveLocale(locale: string): void {
    const g = getBrowserGlobal();
    if (!g.document) {
      return;
    }
    const maxAge = this.cookieExpireDays * 24 * 60 * 60;
    g.document.cookie = `${this.cookieName}=${locale};path=/;max-age=${maxAge}`;
  }

  /**
   * 更新 HTML lang 属性
   *
   * @param locale - 语言
   */
  private updateHtmlLang(locale: string): void {
    const g = getBrowserGlobal();
    if (!g.document) {
      return;
    }
    g.document.documentElement.setAttribute("lang", locale);
  }

  /**
   * 通知所有回调
   *
   * @param locale - 当前语言
   */
  private notifyCallbacks(locale: string): void {
    for (const callback of this.callbacks) {
      try {
        callback(locale);
      } catch (error) {
        console.error("[I18nClient] 回调执行出错:", error);
      }
    }
  }

  /**
   * 根据键路径获取翻译值
   *
   * @param key - 键路径（支持点分隔，如 "nav.home"）
   * @param data - 翻译数据对象
   * @returns 翻译值，未找到返回 undefined
   */
  private getNestedValue(
    key: string,
    data: TranslationData,
  ): string | undefined {
    const keys = key.split(".");
    let current: TranslationData | string = data;

    for (const k of keys) {
      if (typeof current !== "object" || current === null) {
        return undefined;
      }
      current = current[k] as TranslationData | string;
      if (current === undefined) {
        return undefined;
      }
    }

    return typeof current === "string" ? current : undefined;
  }

  /**
   * 替换翻译中的参数占位符
   *
   * @param text - 翻译文本
   * @param params - 参数对象
   * @returns 替换后的文本
   */
  private interpolate(text: string, params: TranslationParams): string {
    return text.replace(/\{(\w+)\}/g, (_, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : `{${key}}`;
    });
  }

  /**
   * 获取当前语言
   *
   * @returns 当前语言代码
   */
  get locale(): string {
    return this.currentLocale;
  }

  /**
   * 获取支持的语言列表
   *
   * @returns 语言列表
   */
  get supportedLocales(): string[] {
    return [...this.locales];
  }

  /**
   * 设置当前语言
   *
   * @param locale - 语言代码
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * i18n.setLocale("en-US");
   * ```
   */
  setLocale(locale: string): boolean {
    // 检查语言是否支持
    if (!this.locales.includes(locale)) {
      console.warn(`[I18nClient] 不支持的语言: ${locale}`);
      return false;
    }

    // 如果语言相同，不做处理
    if (this.currentLocale === locale) {
      return true;
    }

    this.currentLocale = locale;
    this.saveLocale(locale);
    this.updateHtmlLang(locale);
    this.notifyCallbacks(locale);

    return true;
  }

  /**
   * 翻译函数
   *
   * @param key - 翻译键
   * @param params - 参数对象（用于替换占位符）
   * @returns 翻译后的文本
   *
   * @example
   * ```typescript
   * i18n.t("greeting"); // "你好"
   * i18n.t("greeting", { name: "张三" }); // "你好，张三！"
   * i18n.t("nav.home"); // "首页"（支持嵌套键）
   * ```
   */
  t(key: string, params?: TranslationParams): string {
    const localeData = this.translations[this.currentLocale];

    if (!localeData) {
      return this.handleMissingTranslation(key);
    }

    const value = this.getNestedValue(key, localeData);

    if (value === undefined) {
      return this.handleMissingTranslation(key);
    }

    // 如果有参数，进行插值替换
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  /**
   * 处理缺失的翻译
   *
   * @param key - 翻译键
   * @returns 回退值
   */
  private handleMissingTranslation(key: string): string {
    switch (this.fallbackBehavior) {
      case "empty":
        return "";
      case "default": {
        // 尝试从默认语言获取
        const defaultData = this.translations[this.locales[0]];
        if (defaultData) {
          const value = this.getNestedValue(key, defaultData);
          if (value) return value;
        }
        return key;
      }
      case "key":
      default:
        return key;
    }
  }

  /**
   * 检查翻译键是否存在
   *
   * @param key - 翻译键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const localeData = this.translations[this.currentLocale];
    if (!localeData) return false;
    return this.getNestedValue(key, localeData) !== undefined;
  }

  /**
   * 添加翻译数据
   *
   * @param locale - 语言代码
   * @param data - 翻译数据
   *
   * @example
   * ```typescript
   * i18n.addTranslations("zh-CN", {
   *   newKey: "新的翻译"
   * });
   * ```
   */
  addTranslations(locale: string, data: TranslationData): void {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }

    // 深度合并
    this.mergeDeep(this.translations[locale], data);
  }

  /**
   * 深度合并对象
   *
   * @param target - 目标对象
   * @param source - 源对象
   */
  private mergeDeep(target: TranslationData, source: TranslationData): void {
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        typeof targetValue === "object" &&
        targetValue !== null
      ) {
        this.mergeDeep(
          targetValue as TranslationData,
          sourceValue as TranslationData,
        );
      } else {
        target[key] = sourceValue;
      }
    }
  }

  /**
   * 格式化数字
   *
   * @param value - 数字值
   * @param options - 格式化选项（覆盖默认选项）
   * @returns 格式化后的字符串
   *
   * @example
   * ```typescript
   * i18n.formatNumber(1234567.89); // "1,234,567.89"
   * i18n.formatNumber(1234.5, { decimals: 0 }); // "1,235"
   * ```
   */
  formatNumber(value: number, options?: Partial<NumberFormatOptions>): string {
    const opts = { ...this.numberFormat, ...options };

    // 固定小数位数
    const fixed = value.toFixed(opts.decimals);

    // 分离整数和小数部分
    const [intPart, decPart] = fixed.split(".");

    // 添加千位分隔符
    const formattedInt = intPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      opts.thousandsSeparator ?? ",",
    );

    // 组合结果
    if (decPart) {
      return `${formattedInt}${opts.decimalSeparator}${decPart}`;
    }

    return formattedInt;
  }

  /**
   * 格式化货币
   *
   * @param value - 金额
   * @param currency - 货币符号（默认根据语言选择）
   * @returns 格式化后的货币字符串
   *
   * @example
   * ```typescript
   * i18n.formatCurrency(1234.56); // "¥1,234.56" (zh-CN) 或 "$1,234.56" (en-US)
   * i18n.formatCurrency(1234.56, "€"); // "€1,234.56"
   * ```
   */
  formatCurrency(value: number, currency?: string): string {
    const currencySymbol = currency ??
      (this.currentLocale.startsWith("zh")
        ? "¥"
        : this.currentLocale.startsWith("en")
        ? "$"
        : "¤");

    return `${currencySymbol}${this.formatNumber(value)}`;
  }

  /**
   * 格式化日期
   *
   * @param date - 日期对象或时间戳
   * @param format - 格式类型（"date" | "time" | "datetime"）或自定义格式
   * @returns 格式化后的日期字符串
   *
   * @example
   * ```typescript
   * i18n.formatDate(new Date(), "date"); // "2024-01-15"
   * i18n.formatDate(Date.now(), "datetime"); // "2024-01-15 14:30:00"
   * ```
   */
  formatDate(
    date: Date | number,
    format: "date" | "time" | "datetime" | string = "date",
  ): string {
    const d = typeof date === "number" ? new Date(date) : date;

    // 获取格式模板
    let pattern: string;
    if (format === "date" || format === "time" || format === "datetime") {
      pattern = this.dateFormat[format] ?? "YYYY-MM-DD";
    } else {
      pattern = format;
    }

    // 格式化各个部分
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    // 替换占位符
    return pattern
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * 格式化相对时间
   *
   * @param date - 日期对象或时间戳
   * @returns 相对时间字符串
   *
   * @example
   * ```typescript
   * i18n.formatRelative(Date.now() - 60000); // "1 分钟前" (zh-CN) 或 "1 minute ago" (en-US)
   * ```
   */
  formatRelative(date: Date | number): string {
    const d = typeof date === "number" ? new Date(date) : date;
    const now = Date.now();
    const diff = now - d.getTime();
    const absDiff = Math.abs(diff);

    const isZh = this.currentLocale.startsWith("zh");

    // 时间单位（毫秒）
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;

    // 根据时间差选择合适的单位
    let value: number;
    let unit: string;

    if (absDiff < MINUTE) {
      return isZh ? "刚刚" : "just now";
    } else if (absDiff < HOUR) {
      value = Math.floor(absDiff / MINUTE);
      unit = isZh ? "分钟" : value === 1 ? "minute" : "minutes";
    } else if (absDiff < DAY) {
      value = Math.floor(absDiff / HOUR);
      unit = isZh ? "小时" : value === 1 ? "hour" : "hours";
    } else if (absDiff < WEEK) {
      value = Math.floor(absDiff / DAY);
      unit = isZh ? "天" : value === 1 ? "day" : "days";
    } else if (absDiff < MONTH) {
      value = Math.floor(absDiff / WEEK);
      unit = isZh ? "周" : value === 1 ? "week" : "weeks";
    } else if (absDiff < YEAR) {
      value = Math.floor(absDiff / MONTH);
      unit = isZh ? "个月" : value === 1 ? "month" : "months";
    } else {
      value = Math.floor(absDiff / YEAR);
      unit = isZh ? "年" : value === 1 ? "year" : "years";
    }

    // 格式化结果
    if (isZh) {
      return diff > 0 ? `${value} ${unit}前` : `${value} ${unit}后`;
    } else {
      return diff > 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
    }
  }

  /**
   * 监听语言变化
   *
   * @param callback - 语言变化时的回调函数
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const unsubscribe = i18n.onChange((locale) => {
   *   console.log(`语言已切换到: ${locale}`);
   * });
   *
   * // 稍后取消监听
   * unsubscribe();
   * ```
   */
  onChange(callback: LocaleChangeCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(): void {
    this.callbacks.clear();
  }
}

/**
 * 创建 i18n 客户端实例的工厂函数
 *
 * @param options - 配置选项
 * @returns I18nClient 实例
 *
 * @example
 * ```typescript
 * import { createI18nClient } from "@dreamer/plugins/i18n/client";
 *
 * const i18n = createI18nClient({
 *   defaultLocale: "zh-CN",
 *   translations: { ... }
 * });
 * ```
 */
export function createI18nClient(options: I18nClientOptions = {}): I18nClient {
  return new I18nClient(options);
}

// 导出默认实例（懒加载）
let defaultClient: I18nClient | null = null;

/**
 * 获取默认的 i18n 客户端实例
 *
 * @returns 默认的 I18nClient 实例
 *
 * @example
 * ```typescript
 * import { getI18nClient } from "@dreamer/plugins/i18n/client";
 *
 * const i18n = getI18nClient();
 * i18n.t("greeting");
 * ```
 */
export function getI18nClient(): I18nClient {
  if (!defaultClient) {
    defaultClient = new I18nClient();
  }
  return defaultClient;
}

/**
 * 全局翻译函数类型
 */
export type GlobalTranslateFunction = (
  key: string,
  params?: TranslationParams,
) => string;

/**
 * 全局对象类型（用于类型断言）
 */
interface I18nGlobalThis {
  $t?: GlobalTranslateFunction;
  $i18n?: I18nClient;
}

/**
 * 获取类型安全的全局对象引用
 *
 * @returns 类型安全的全局对象
 */
function getGlobalRef(): I18nGlobalThis {
  return globalThis as unknown as I18nGlobalThis;
}

/**
 * 注册全局翻译方法 $t 和 $i18n
 *
 * 将翻译函数注册到全局对象，方便在任何地方直接调用
 *
 * @param client - I18nClient 实例（可选，默认使用 getI18nClient()）
 * @returns I18nClient 实例
 *
 * @example
 * ```typescript
 * import { installI18n } from "@dreamer/plugins/i18n/client";
 *
 * // 使用默认配置安装
 * installI18n();
 *
 * // 或者使用自定义配置
 * installI18n(new I18nClient({
 *   defaultLocale: "zh-CN",
 *   translations: { ... }
 * }));
 *
 * // 然后在任何地方直接使用
 * const g = globalThis as any;
 * g.$t("greeting");                    // 简单翻译
 * g.$t("greeting", { name: "张三" });  // 带参数翻译
 * g.$i18n.setLocale("en-US");          // 切换语言
 * g.$i18n.formatDate(new Date());      // 格式化日期
 * ```
 */
export function installI18n(client?: I18nClient): I18nClient {
  const i18n = client ?? getI18nClient();
  const g = getGlobalRef();

  // 注册全局 $t 函数
  g.$t = (key: string, params?: TranslationParams) => {
    return i18n.t(key, params);
  };

  // 注册全局 $i18n 实例
  g.$i18n = i18n;

  // 如果传入了自定义实例，也更新默认实例
  if (client) {
    defaultClient = client;
  }

  return i18n;
}

/**
 * 卸载全局翻译方法
 *
 * 从全局对象移除 $t 和 $i18n
 *
 * @example
 * ```typescript
 * import { uninstallI18n } from "@dreamer/plugins/i18n/client";
 *
 * uninstallI18n();
 * ```
 */
export function uninstallI18n(): void {
  const g = getGlobalRef();
  delete g.$t;
  delete g.$i18n;
}

/**
 * 检查 i18n 是否已安装
 *
 * @returns 是否已安装
 */
export function isI18nInstalled(): boolean {
  const g = getGlobalRef();
  return typeof g.$t === "function";
}

/**
 * 全局翻译函数（需要先调用 installI18n）
 *
 * 这是一个便捷的导出，可以在模块中直接导入使用
 * 注意：必须先调用 installI18n() 才能使用
 *
 * @example
 * ```typescript
 * import { installI18n, $t } from "@dreamer/plugins/i18n/client";
 *
 * installI18n({ translations: { ... } });
 *
 * // 在模块中使用
 * const greeting = $t("greeting");
 * ```
 */
export const $t: GlobalTranslateFunction = (
  key: string,
  params?: TranslationParams,
) => {
  if (!defaultClient) {
    console.warn("[I18nClient] 请先调用 installI18n() 初始化");
    return key;
  }
  return defaultClient.t(key, params);
};

/**
 * 获取全局 i18n 实例（需要先调用 installI18n）
 *
 * @returns I18nClient 实例或 undefined
 */
export function getGlobalI18n(): I18nClient | undefined {
  return getGlobalRef().$i18n;
}
