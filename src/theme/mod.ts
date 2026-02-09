/**
 * 主题插件
 *
 * 服务端主题管理插件，基于 @dreamer/theme 库
 * 提供请求级别的主题检测和 HTML 注入功能
 *
 * @module
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import {
  createTheme,
  type DarkModeStrategy,
  type Theme,
  type ThemeMode,
} from "@dreamer/theme";

// 重新导出 @dreamer/theme 的类型和函数
export type { DarkModeStrategy, ThemeMode, ThemeOptions } from "@dreamer/theme";
export {
  createTheme,
  destroyTheme,
  getAppliedTheme,
  getTheme,
  getThemeMode,
  setThemeMode,
  Theme,
  THEME_CHANGE_EVENT,
  toggleTheme,
} from "@dreamer/theme";

/**
 * 主题插件选项
 */
export interface ThemePluginOptions {
  /**
   * 默认主题模式
   * @default "system"
   */
  defaultMode?: ThemeMode;

  /**
   * 暗黑模式策略
   * @default "class"
   */
  strategy?: DarkModeStrategy;

  /**
   * 深色模式 class 名称
   * @default "dark"
   */
  darkClass?: string;

  /**
   * HTML 属性名（strategy="attribute" 时使用）
   * @default "data-theme"
   */
  attribute?: string;

  /**
   * Cookie 名称（用于持久化）
   * @default "theme"
   */
  cookieName?: string;

  /**
   * Cookie 过期天数
   * @default 365
   */
  cookieExpireDays?: number;

  /**
   * 是否注入防闪烁脚本
   * @default true
   */
  injectScript?: boolean;

  /**
   * 过渡动画时长（毫秒）
   * @default 200
   */
  transitionDuration?: number;

  /**
   * 是否启用调试日志
   * @default false
   */
  debug?: boolean;
}

/**
 * 生成防闪烁脚本
 *
 * @param options - 脚本选项
 * @returns 脚本 HTML
 */
function generateAntiFlashScript(options: {
  cookieName: string;
  cookieExpireDays: number;
  strategy: DarkModeStrategy;
  darkClass: string;
  attribute: string;
  defaultMode: ThemeMode;
  transitionDuration: number;
}): string {
  const {
    cookieName,
    cookieExpireDays,
    strategy,
    darkClass,
    attribute,
    defaultMode,
    transitionDuration,
  } = options;

  return `<script>
(function() {
  // 获取存储的主题
  function getStoredTheme() {
    try {
      var stored = localStorage.getItem('${cookieName}');
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch(e) {}
    var match = document.cookie.match(/(^| )${cookieName}=([^;]+)/);
    return match ? match[2] : null;
  }

  // 获取系统偏好
  function getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // 解析主题
  var stored = getStoredTheme();
  var theme = stored === 'system' || !stored ? getSystemPreference() : stored;
  if (stored === null) theme = '${
    defaultMode === "system" ? "' + getSystemPreference() + '" : defaultMode
  }';

  // 应用主题
  var html = document.documentElement;
  ${
    strategy === "class"
      ? `
  if (theme === 'dark') {
    html.classList.add('${darkClass}');
  } else {
    html.classList.remove('${darkClass}');
  }`
      : `
  html.setAttribute('${attribute}', theme);`
  }

  // 主题管理器
  window.$theme = {
    current: theme,
    mode: stored || '${defaultMode}',

    toggle: function() {
      var next = this.current === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
      return next;
    },

    setTheme: function(mode) {
      this.mode = mode;
      this.current = mode === 'system' ? getSystemPreference() : mode;
      this.apply(true);
      this.save(mode);
      this.dispatch();
    },

    apply: function(animate) {
      var html = document.documentElement;
      if (animate) {
        html.style.transition = 'background-color ${transitionDuration}ms, color ${transitionDuration}ms';
        setTimeout(function() { html.style.transition = ''; }, ${transitionDuration});
      }
      ${
    strategy === "class"
      ? `
      if (this.current === 'dark') {
        html.classList.add('${darkClass}');
      } else {
        html.classList.remove('${darkClass}');
      }`
      : `
      html.setAttribute('${attribute}', this.current);`
  }
    },

    save: function(mode) {
      try { localStorage.setItem('${cookieName}', mode); } catch(e) {}
      document.cookie = '${cookieName}=' + mode + ';path=/;max-age=${
    cookieExpireDays * 24 * 60 * 60
  };SameSite=Lax';
    },

    dispatch: function() {
      window.dispatchEvent(new CustomEvent('theme:change', {
        detail: { theme: this.current, mode: this.mode }
      }));
    }
  };

  // 监听系统偏好变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (window.$theme.mode === 'system') {
        window.$theme.current = e.matches ? 'dark' : 'light';
        window.$theme.apply(true);
        window.$theme.dispatch();
      }
    });
  }
})();
</script>`;
}

/**
 * 创建主题插件
 *
 * 服务端插件，用于：
 * - 从请求中检测用户主题偏好
 * - 注入防闪烁脚本到 HTML
 * - 设置 HTML 标签的主题属性
 *
 * @param options - 插件选项
 * @returns Plugin 实例
 *
 * @example
 * ```typescript
 * import { themePlugin } from "@dreamer/plugins/theme";
 *
 * const plugin = themePlugin({
 *   defaultMode: "system",
 *   strategy: "class",
 * });
 * ```
 */
export function themePlugin(options: ThemePluginOptions = {}): Plugin {
  // 解构配置，设置默认值
  const {
    defaultMode = "system",
    strategy = "class",
    darkClass = "dark",
    attribute = "data-theme",
    cookieName = "theme",
    cookieExpireDays = 365,
    injectScript = true,
    transitionDuration = 200,
    debug = false,
  } = options;

  // 当前请求的主题状态
  let currentTheme: "light" | "dark" = "light";
  let currentMode: ThemeMode = defaultMode;

  // 创建主题实例（用于服务端逻辑）
  let themeInstance: Theme | null = null;

  return {
    name: "@dreamer/plugins-theme",
    version: "1.0.0",

    // 插件配置
    config: {
      theme: {
        defaultMode,
        strategy,
        darkClass,
        attribute,
        cookieName,
        cookieExpireDays,
        injectScript,
        transitionDuration,
      },
    },

    /**
     * 验证配置有效性
     */
    validateConfig(config: Record<string, unknown>): boolean {
      const themeConfig = config.theme as Record<string, unknown> | undefined;
      if (!themeConfig) return true;

      // 验证 defaultMode
      if (
        themeConfig.defaultMode &&
        !["light", "dark", "system"].includes(themeConfig.defaultMode as string)
      ) {
        return false;
      }

      // 验证 strategy
      if (
        themeConfig.strategy &&
        !["class", "attribute", "media"].includes(
          themeConfig.strategy as string,
        )
      ) {
        return false;
      }

      // 验证 transitionDuration
      if (
        themeConfig.transitionDuration !== undefined &&
        (typeof themeConfig.transitionDuration !== "number" ||
          themeConfig.transitionDuration < 0)
      ) {
        return false;
      }

      return true;
    },

    /**
     * 初始化钩子
     * 注册主题服务到容器
     */
    onInit(container: ServiceContainer) {
      // 创建主题实例
      themeInstance = createTheme({
        defaultMode,
        strategy,
        darkClass,
        attribute,
        storageKey: cookieName,
        storageType: "cookie",
        cookieExpireDays,
        transitionDuration,
      });

      // 注册主题配置服务
      container.registerSingleton("themeConfig", () => ({
        defaultMode,
        strategy,
        darkClass,
        attribute,
        cookieName,
        cookieExpireDays,
        injectScript,
        transitionDuration,
      }));

      // 注册主题服务
      container.registerSingleton("themeService", () => ({
        /**
         * 获取当前主题
         */
        getCurrentTheme: () => currentTheme,

        /**
         * 获取当前模式
         */
        getCurrentMode: () => currentMode,

        /**
         * 设置主题
         */
        setTheme: (theme: "light" | "dark") => {
          currentTheme = theme;
          currentMode = theme;
        },

        /**
         * 设置模式
         */
        setMode: (mode: ThemeMode) => {
          currentMode = mode;
          if (mode === "light" || mode === "dark") {
            currentTheme = mode;
          }
        },

        /**
         * 获取 Theme 实例
         */
        getInstance: () => themeInstance,
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `主题插件已初始化: defaultMode=${defaultMode}, strategy=${strategy}`,
          );
        }
      }
    },

    /**
     * 请求处理前钩子
     * 检测用户主题偏好
     */
    onRequest(ctx: RequestContext, _container: ServiceContainer) {
      // 从 Cookie 读取主题偏好
      const cookies = ctx.cookies as
        | { get?: (name: string) => string | undefined }
        | undefined;
      const savedTheme = cookies?.get?.(cookieName);

      if (savedTheme) {
        if (savedTheme === "system") {
          currentMode = "system";
          // 服务端无法检测系统偏好，使用 light 作为默认
          currentTheme = "light";
        } else if (savedTheme === "light" || savedTheme === "dark") {
          currentTheme = savedTheme;
          currentMode = savedTheme;
        }
      } else {
        // 无存储时使用默认模式
        currentMode = defaultMode;
        currentTheme = defaultMode === "system" ? "light" : defaultMode;
      }

      // 存储到请求上下文
      (ctx as Record<string, unknown>).theme = currentTheme;
      (ctx as Record<string, unknown>).themeMode = currentMode;
    },

    /**
     * 响应处理后钩子
     * 注入防闪烁脚本和主题属性
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 只处理 HTML 响应
      const contentType = ctx.response?.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response!.text();
        let modifiedHtml = html;

        // 注入防闪烁脚本
        if (injectScript) {
          const script = generateAntiFlashScript({
            cookieName,
            cookieExpireDays,
            strategy,
            darkClass,
            attribute,
            defaultMode,
            transitionDuration,
          });

          // 注入到 <head> 开始处（尽早执行）
          modifiedHtml = modifiedHtml.replace(
            /<head([^>]*)>/i,
            `<head$1>\n${script}`,
          );
        }

        // 添加主题属性到 <html>
        if (strategy === "class") {
          // class 策略：添加 dark class
          if (currentTheme === "dark") {
            modifiedHtml = modifiedHtml.replace(
              /<html([^>]*)class="([^"]*)"([^>]*)>/i,
              `<html$1class="$2 ${darkClass}"$3>`,
            );
            // 如果没有 class 属性，添加一个
            if (!/<html[^>]*class=/i.test(modifiedHtml)) {
              modifiedHtml = modifiedHtml.replace(
                /<html([^>]*)>/i,
                `<html$1 class="${darkClass}">`,
              );
            }
          }
        } else if (strategy === "attribute") {
          // attribute 策略：添加 data-theme 属性
          modifiedHtml = modifiedHtml.replace(
            /<html([^>]*)>/i,
            `<html$1 ${attribute}="${currentTheme}">`,
          );
        }

        ctx.response = new Response(modifiedHtml, {
          status: ctx.response!.status,
          statusText: ctx.response!.statusText,
          headers: ctx.response!.headers,
        });
      } catch (error) {
        // 注入失败，记录错误但不影响响应
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ warn: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.warn(
              `主题注入失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }
    },
  };
}
