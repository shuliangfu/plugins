/**
 * Theme 主题插件客户端模块
 *
 * 提供浏览器端主题管理功能，包括：
 * - 获取/设置当前主题
 * - 切换主题（toggle）
 * - 监听主题变化
 * - 系统偏好检测
 *
 * @module
 */

/**
 * DOM 相关类型定义（用于浏览器环境）
 */
interface BrowserDocument {
  cookie: string;
  documentElement: {
    style: {
      transition: string;
      setProperty: (name: string, value: string) => void;
    };
    setAttribute: (name: string, value: string) => void;
  };
}

interface BrowserMediaQueryList {
  matches: boolean;
  addEventListener?: (
    type: string,
    listener: (e: { matches: boolean }) => void,
  ) => void;
}

interface BrowserWindow {
  document?: BrowserDocument;
  matchMedia?: (query: string) => BrowserMediaQueryList;
  getComputedStyle?: (
    el: unknown,
  ) => { getPropertyValue: (name: string) => string };
  navigator?: { language?: string; userLanguage?: string };
}

/**
 * 获取浏览器全局对象
 */
function getBrowserGlobal(): BrowserWindow {
  return globalThis as unknown as BrowserWindow;
}

/**
 * 主题模式类型
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 主题变化事件回调
 */
export type ThemeChangeCallback = (theme: string, mode: ThemeMode) => void;

/**
 * 主题客户端配置选项
 */
export interface ThemeClientOptions {
  /** Cookie 名称（默认："theme"） */
  cookieName?: string;
  /** Cookie 过期时间（天，默认：365） */
  cookieExpireDays?: number;
  /** HTML 属性名（默认："data-theme"） */
  htmlAttribute?: string;
  /** 默认主题模式（默认："system"） */
  defaultMode?: ThemeMode;
  /** 是否检测系统偏好（默认：true） */
  detectSystemPreference?: boolean;
  /** 过渡动画持续时间（毫秒，默认：200） */
  transitionDuration?: number;
}

/**
 * 主题客户端类
 *
 * 在浏览器端管理主题状态和切换
 *
 * @example
 * ```typescript
 * import { ThemeClient } from "@dreamer/plugins/theme/client";
 *
 * const theme = new ThemeClient();
 *
 * // 获取当前主题
 * console.log(theme.current); // "light" | "dark" | 自定义主题名
 *
 * // 切换主题
 * theme.toggle();
 *
 * // 设置指定主题
 * theme.set("dark");
 *
 * // 监听主题变化
 * theme.onChange((newTheme, mode) => {
 *   console.log(`主题已切换到: ${newTheme}, 模式: ${mode}`);
 * });
 * ```
 */
export class ThemeClient {
  /** Cookie 名称 */
  private cookieName: string;
  /** Cookie 过期时间（天） */
  private cookieExpireDays: number;
  /** HTML 属性名 */
  private htmlAttribute: string;
  /** 默认主题模式 */
  private defaultMode: ThemeMode;
  /** 是否检测系统偏好 */
  private detectSystemPreference: boolean;
  /** 过渡动画持续时间 */
  private transitionDuration: number;
  /** 主题变化回调列表 */
  private callbacks: Set<ThemeChangeCallback> = new Set();
  /** 系统偏好媒体查询 */
  private mediaQuery: BrowserMediaQueryList | null = null;

  /**
   * 创建主题客户端实例
   *
   * @param options - 配置选项
   */
  constructor(options: ThemeClientOptions = {}) {
    this.cookieName = options.cookieName ?? "theme";
    this.cookieExpireDays = options.cookieExpireDays ?? 365;
    this.htmlAttribute = options.htmlAttribute ?? "data-theme";
    this.defaultMode = options.defaultMode ?? "system";
    this.detectSystemPreference = options.detectSystemPreference ?? true;
    this.transitionDuration = options.transitionDuration ?? 200;

    // 初始化系统偏好监听
    this.initSystemPreferenceListener();
  }

  /**
   * 初始化系统偏好监听器
   */
  private initSystemPreferenceListener(): void {
    const g = getBrowserGlobal();

    // 检查是否在浏览器环境
    if (!g.matchMedia) {
      return;
    }

    this.mediaQuery = g.matchMedia("(prefers-color-scheme: dark)");

    // 监听系统偏好变化
    const handleChange = (e: { matches: boolean }) => {
      const savedMode = this.getSavedMode();
      // 只有在 system 模式下才响应系统偏好变化
      if (!savedMode || savedMode === "system") {
        const newTheme = e.matches ? "dark" : "light";
        this.applyTheme(newTheme, true);
        this.notifyCallbacks(newTheme, "system");
      }
    };

    // 使用 addEventListener（现代浏览器）
    if (this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener("change", handleChange);
    }
  }

  /**
   * 获取系统偏好的主题
   *
   * @returns 系统偏好的主题（"light" 或 "dark"）
   */
  getSystemPreference(): "light" | "dark" {
    if (this.mediaQuery?.matches) {
      return "dark";
    }
    return "light";
  }

  /**
   * 获取保存的主题模式
   *
   * @returns 保存的主题模式，未保存则返回 null
   */
  private getSavedMode(): string | null {
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
   * 保存主题到 Cookie
   *
   * @param theme - 要保存的主题
   */
  private saveTheme(theme: string): void {
    const g = getBrowserGlobal();
    if (!g.document) {
      return;
    }
    const maxAge = this.cookieExpireDays * 24 * 60 * 60;
    g.document.cookie = `${this.cookieName}=${theme};path=/;max-age=${maxAge}`;
  }

  /**
   * 应用主题到 DOM
   *
   * @param theme - 要应用的主题
   * @param animate - 是否启用过渡动画
   */
  private applyTheme(theme: string, animate: boolean = false): void {
    const g = getBrowserGlobal();
    if (!g.document) {
      return;
    }

    const html = g.document.documentElement;

    // 添加过渡动画
    if (animate && this.transitionDuration > 0) {
      html.style.transition =
        `background-color ${this.transitionDuration}ms, color ${this.transitionDuration}ms`;
      setTimeout(() => {
        html.style.transition = "";
      }, this.transitionDuration);
    }

    html.setAttribute(this.htmlAttribute, theme);
  }

  /**
   * 通知所有回调
   *
   * @param theme - 当前主题
   * @param mode - 当前模式
   */
  private notifyCallbacks(theme: string, mode: ThemeMode): void {
    for (const callback of this.callbacks) {
      try {
        callback(theme, mode);
      } catch (error) {
        console.error("[ThemeClient] 回调执行出错:", error);
      }
    }
  }

  /**
   * 获取当前主题
   *
   * @returns 当前主题名称
   */
  get current(): string {
    const saved = this.getSavedMode();

    if (saved && saved !== "system") {
      return saved;
    }

    if (this.detectSystemPreference) {
      return this.getSystemPreference();
    }

    return this.defaultMode === "system" ? "light" : this.defaultMode;
  }

  /**
   * 获取当前模式
   *
   * @returns 当前主题模式
   */
  get mode(): ThemeMode {
    const saved = this.getSavedMode();

    if (saved === "system") {
      return "system";
    }

    if (saved === "light" || saved === "dark") {
      return saved;
    }

    // 如果保存的是自定义主题名，无法确定模式
    if (saved) {
      return "light"; // 默认返回 light
    }

    return this.defaultMode;
  }

  /**
   * 检查当前是否为深色主题
   *
   * @returns 是否为深色主题
   */
  get isDark(): boolean {
    return this.current === "dark";
  }

  /**
   * 检查当前是否为浅色主题
   *
   * @returns 是否为浅色主题
   */
  get isLight(): boolean {
    return this.current === "light";
  }

  /**
   * 检查当前是否为系统模式
   *
   * @returns 是否为系统模式
   */
  get isSystem(): boolean {
    return this.mode === "system";
  }

  /**
   * 设置主题
   *
   * @param theme - 主题名称或模式（"light" | "dark" | "system" | 自定义主题名）
   *
   * @example
   * ```typescript
   * theme.set("dark");      // 设置为深色主题
   * theme.set("light");     // 设置为浅色主题
   * theme.set("system");    // 跟随系统偏好
   * theme.set("ocean");     // 设置为自定义主题
   * ```
   */
  set(theme: string): void {
    this.saveTheme(theme);

    let actualTheme: string;
    let mode: ThemeMode;

    if (theme === "system") {
      actualTheme = this.getSystemPreference();
      mode = "system";
    } else {
      actualTheme = theme;
      mode = theme === "light" || theme === "dark" ? theme : "light";
    }

    this.applyTheme(actualTheme, true);
    this.notifyCallbacks(actualTheme, mode);
  }

  /**
   * 切换主题（在 light 和 dark 之间切换）
   *
   * @returns 切换后的主题
   *
   * @example
   * ```typescript
   * const newTheme = theme.toggle();
   * console.log(`切换到: ${newTheme}`);
   * ```
   */
  toggle(): string {
    const current = this.current;
    const next = current === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  }

  /**
   * 设置为浅色主题
   */
  setLight(): void {
    this.set("light");
  }

  /**
   * 设置为深色主题
   */
  setDark(): void {
    this.set("dark");
  }

  /**
   * 设置为系统偏好模式
   */
  setSystem(): void {
    this.set("system");
  }

  /**
   * 监听主题变化
   *
   * @param callback - 主题变化时的回调函数
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const unsubscribe = theme.onChange((newTheme, mode) => {
   *   console.log(`主题: ${newTheme}, 模式: ${mode}`);
   * });
   *
   * // 稍后取消监听
   * unsubscribe();
   * ```
   */
  onChange(callback: ThemeChangeCallback): () => void {
    this.callbacks.add(callback);

    // 返回取消监听的函数
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

  /**
   * 获取 CSS 变量值
   *
   * @param variable - CSS 变量名（不带 -- 前缀）
   * @param prefix - 变量前缀（默认："theme"）
   * @returns CSS 变量值
   *
   * @example
   * ```typescript
   * const primaryColor = theme.getCssVar("color-primary");
   * console.log(primaryColor); // "#3b82f6"
   * ```
   */
  getCssVar(variable: string, prefix: string = "theme"): string {
    const g = getBrowserGlobal();
    if (!g.document || !g.getComputedStyle) {
      return "";
    }
    const fullVar = `--${prefix}-${variable}`;
    return g.getComputedStyle(g.document.documentElement)
      .getPropertyValue(fullVar)
      .trim();
  }

  /**
   * 设置 CSS 变量值
   *
   * @param variable - CSS 变量名（不带 -- 前缀）
   * @param value - 变量值
   * @param prefix - 变量前缀（默认："theme"）
   *
   * @example
   * ```typescript
   * theme.setCssVar("color-primary", "#ff0000");
   * ```
   */
  setCssVar(variable: string, value: string, prefix: string = "theme"): void {
    const g = getBrowserGlobal();
    if (!g.document) {
      return;
    }
    const fullVar = `--${prefix}-${variable}`;
    g.document.documentElement.style.setProperty(fullVar, value);
  }
}

/**
 * 创建主题客户端实例的工厂函数
 *
 * @param options - 配置选项
 * @returns ThemeClient 实例
 *
 * @example
 * ```typescript
 * import { createThemeClient } from "@dreamer/plugins/theme/client";
 *
 * const theme = createThemeClient({
 *   cookieName: "app-theme",
 *   defaultMode: "dark",
 * });
 * ```
 */
export function createThemeClient(
  options: ThemeClientOptions = {},
): ThemeClient {
  return new ThemeClient(options);
}

// 导出默认实例（懒加载）
let defaultClient: ThemeClient | null = null;

/**
 * 获取默认的主题客户端实例
 *
 * @returns 默认的 ThemeClient 实例
 *
 * @example
 * ```typescript
 * import { getThemeClient } from "@dreamer/plugins/theme/client";
 *
 * const theme = getThemeClient();
 * theme.toggle();
 * ```
 */
export function getThemeClient(): ThemeClient {
  if (!defaultClient) {
    defaultClient = new ThemeClient();
  }
  return defaultClient;
}
