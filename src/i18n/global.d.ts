/**
 * @dreamer/plugins/i18n 全局类型声明
 *
 * 复制此文件到你的项目中，然后在 TypeScript 项目中引入后，
 * 可以直接使用全局 $t 和 $i18n，无需 import
 *
 * @example deno.json 或 tsconfig.json 配置
 * ```json
 * {
 *   "compilerOptions": {
 *     "types": ["./global.d.ts"]
 *   }
 * }
 * ```
 *
 * @example 直接在文件中引用
 * ```typescript
 * /// <reference path="./global.d.ts" />
 *
 * // 然后可以直接使用，无需 import
 * const text = $t("hello");
 * $i18n.setLocale("en-US");
 * ```
 */

/**
 * 翻译参数类型
 */
type I18nTranslationParams = Record<string, string | number>;

/**
 * 翻译数据类型
 */
interface I18nTranslationData {
  [key: string]: string | I18nTranslationData;
}

/**
 * 全局翻译函数类型
 */
type GlobalTranslateFunction = (
  key: string,
  params?: I18nTranslationParams,
) => string;

/**
 * 全局 i18n 服务接口
 */
interface GlobalI18nService {
  /**
   * 翻译函数
   * @param key - 翻译键（支持点号分隔的嵌套键，如 "menu.home"）
   * @param params - 插值参数
   * @returns 翻译结果
   */
  t: (key: string, params?: I18nTranslationParams) => string;

  /**
   * 获取当前语言
   * @returns 当前语言代码（如 "zh-CN"）
   */
  getLocale: () => string;

  /**
   * 设置当前语言
   * @param locale - 语言代码
   */
  setLocale: (locale: string) => void;

  /**
   * 获取支持的语言列表
   * @returns 语言代码数组
   */
  getLocales: () => string[];

  /**
   * 检查语言是否支持
   * @param locale - 语言代码
   * @returns 是否支持
   */
  isLocaleSupported: (locale: string) => boolean;

  /**
   * 加载翻译数据
   * @param locale - 语言代码
   * @param data - 翻译数据
   */
  loadTranslations: (locale: string, data: I18nTranslationData) => void;

  /**
   * 获取翻译数据
   * @param locale - 语言代码（可选，默认当前语言）
   * @returns 翻译数据
   */
  getTranslations: (locale?: string) => I18nTranslationData;
}

declare global {
  /**
   * 全局翻译函数
   *
   * 使用前需要先初始化 i18n 插件
   *
   * @example
   * ```typescript
   * // 简单翻译
   * const hello = $t("hello");
   *
   * // 带参数插值
   * const welcome = $t("welcome", { name: "张三" });
   *
   * // 嵌套键
   * const menuHome = $t("menu.home");
   * ```
   */
  const $t: GlobalTranslateFunction;

  /**
   * 全局 i18n 服务实例
   *
   * 使用前需要先初始化 i18n 插件
   *
   * @example
   * ```typescript
   * // 获取当前语言
   * const locale = $i18n.getLocale();
   *
   * // 切换语言
   * $i18n.setLocale("en-US");
   *
   * // 加载翻译数据
   * $i18n.loadTranslations("zh-CN", {
   *   hello: "你好",
   *   menu: { home: "首页" }
   * });
   *
   * // 使用翻译
   * const text = $i18n.t("hello");
   * ```
   */
  const $i18n: GlobalI18nService;
}

export {};
