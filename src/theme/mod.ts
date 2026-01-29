/**
 * 主题插件
 *
 * 提供应用主题管理功能，支持深色模式、浅色模式、系统偏好和自定义主题
 *
 * @module
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 主题模式
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  /** 主色调 */
  primary?: string;
  /** 次要色调 */
  secondary?: string;
  /** 强调色 */
  accent?: string;
  /** 背景色 */
  background?: string;
  /** 表面色（卡片、面板等） */
  surface?: string;
  /** 文本色 */
  text?: string;
  /** 次要文本色 */
  textSecondary?: string;
  /** 边框色 */
  border?: string;
  /** 错误色 */
  error?: string;
  /** 警告色 */
  warning?: string;
  /** 成功色 */
  success?: string;
  /** 信息色 */
  info?: string;
  /** 自定义颜色 */
  [key: string]: string | undefined;
}

/**
 * 主题定义
 */
export interface ThemeDefinition {
  /** 主题名称 */
  name: string;
  /** 主题颜色 */
  colors: ThemeColors;
  /** 主题字体 */
  fonts?: {
    /** 主字体 */
    primary?: string;
    /** 次要字体 */
    secondary?: string;
    /** 等宽字体 */
    mono?: string;
  };
  /** 圆角大小 */
  borderRadius?: {
    /** 小圆角 */
    sm?: string;
    /** 中等圆角 */
    md?: string;
    /** 大圆角 */
    lg?: string;
    /** 完全圆角 */
    full?: string;
  };
  /** 阴影 */
  shadows?: {
    /** 小阴影 */
    sm?: string;
    /** 中等阴影 */
    md?: string;
    /** 大阴影 */
    lg?: string;
    /** 超大阴影 */
    xl?: string;
  };
  /** 自定义 CSS 变量 */
  customVariables?: Record<string, string>;
}

/**
 * 主题插件选项
 */
export interface ThemePluginOptions {
  /** 默认主题模式 */
  defaultMode?: ThemeMode;
  /** 默认主题名称（用于自定义主题） */
  defaultTheme?: string;
  /** 是否启用系统偏好检测 */
  detectSystemPreference?: boolean;
  /** 是否持久化主题选择 */
  persistTheme?: boolean;
  /** Cookie 名称 */
  cookieName?: string;
  /** Cookie 过期时间（天） */
  cookieExpireDays?: number;
  /** 浅色主题定义 */
  lightTheme?: ThemeDefinition;
  /** 深色主题定义 */
  darkTheme?: ThemeDefinition;
  /** 自定义主题列表 */
  customThemes?: ThemeDefinition[];
  /** CSS 变量前缀 */
  cssPrefix?: string;
  /** 是否注入主题切换脚本 */
  injectScript?: boolean;
  /** 是否注入系统偏好检测脚本 */
  injectSystemPreferenceScript?: boolean;
  /** HTML 属性名（用于标记当前主题） */
  htmlAttribute?: string;
  /** 过渡动画持续时间（ms） */
  transitionDuration?: number;
}

/**
 * 默认浅色主题
 */
const DEFAULT_LIGHT_THEME: ThemeDefinition = {
  name: "light",
  colors: {
    primary: "#3b82f6",
    secondary: "#6366f1",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    info: "#3b82f6",
  },
  fonts: {
    primary:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: "Georgia, serif",
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
  },
};

/**
 * 默认深色主题
 */
const DEFAULT_DARK_THEME: ThemeDefinition = {
  name: "dark",
  colors: {
    primary: "#60a5fa",
    secondary: "#818cf8",
    accent: "#fbbf24",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
    error: "#f87171",
    warning: "#fbbf24",
    success: "#4ade80",
    info: "#60a5fa",
  },
  fonts: {
    primary:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: "Georgia, serif",
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.4)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.4)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.4)",
  },
};

/**
 * 生成主题 CSS 变量
 *
 * @param theme - 主题定义
 * @param prefix - CSS 变量前缀
 * @returns CSS 变量字符串
 */
function generateCssVariables(theme: ThemeDefinition, prefix: string): string {
  const variables: string[] = [];

  // 颜色变量
  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      if (value) {
        // 将 camelCase 转换为 kebab-case
        const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        variables.push(`  --${prefix}-color-${cssKey}: ${value};`);
      }
    }
  }

  // 字体变量
  if (theme.fonts) {
    for (const [key, value] of Object.entries(theme.fonts)) {
      if (value) {
        const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        variables.push(`  --${prefix}-font-${cssKey}: ${value};`);
      }
    }
  }

  // 圆角变量
  if (theme.borderRadius) {
    for (const [key, value] of Object.entries(theme.borderRadius)) {
      if (value) {
        variables.push(`  --${prefix}-radius-${key}: ${value};`);
      }
    }
  }

  // 阴影变量
  if (theme.shadows) {
    for (const [key, value] of Object.entries(theme.shadows)) {
      if (value) {
        variables.push(`  --${prefix}-shadow-${key}: ${value};`);
      }
    }
  }

  // 自定义变量
  if (theme.customVariables) {
    for (const [key, value] of Object.entries(theme.customVariables)) {
      if (value) {
        variables.push(`  --${prefix}-${key}: ${value};`);
      }
    }
  }

  return variables.join("\n");
}

/**
 * 生成主题切换脚本
 *
 * @param options - 插件选项
 * @returns JavaScript 脚本
 */
function generateThemeScript(options: {
  cookieName: string;
  cookieExpireDays: number;
  htmlAttribute: string;
  defaultMode: ThemeMode;
  detectSystemPreference: boolean;
  transitionDuration: number;
}): string {
  return `
<script>
(function() {
  // 主题管理器
  var ThemeManager = {
    cookieName: '${options.cookieName}',
    htmlAttribute: '${options.htmlAttribute}',
    defaultMode: '${options.defaultMode}',

    // 获取保存的主题
    getSavedTheme: function() {
      var match = document.cookie.match(new RegExp('(^| )' + this.cookieName + '=([^;]+)'));
      return match ? match[2] : null;
    },

    // 保存主题
    saveTheme: function(theme) {
      document.cookie = this.cookieName + '=' + theme + ';path=/;max-age=${
    options.cookieExpireDays * 24 * 60 * 60
  }';
    },

    // 获取系统偏好
    getSystemPreference: function() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    },

    // 获取当前主题
    getCurrentTheme: function() {
      var saved = this.getSavedTheme();
      if (saved && saved !== 'system') {
        return saved;
      }
      ${
    options.detectSystemPreference
      ? "return this.getSystemPreference();"
      : `return '${
        options.defaultMode === "system" ? "light" : options.defaultMode
      }';`
  }
    },

    // 应用主题
    applyTheme: function(theme, animate) {
      var html = document.documentElement;
      if (animate) {
        html.style.transition = 'background-color ${options.transitionDuration}ms, color ${options.transitionDuration}ms';
        setTimeout(function() {
          html.style.transition = '';
        }, ${options.transitionDuration});
      }
      html.setAttribute(this.htmlAttribute, theme);
    },

    // 切换主题
    toggle: function() {
      var current = this.getCurrentTheme();
      var next = current === 'dark' ? 'light' : 'dark';
      this.saveTheme(next);
      this.applyTheme(next, true);
      return next;
    },

    // 设置主题
    setTheme: function(theme) {
      this.saveTheme(theme);
      if (theme === 'system') {
        this.applyTheme(this.getSystemPreference(), true);
      } else {
        this.applyTheme(theme, true);
      }
    },

    // 初始化
    init: function() {
      this.applyTheme(this.getCurrentTheme(), false);
      ${
    options.detectSystemPreference
      ? `
      // 监听系统偏好变化
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
          var saved = ThemeManager.getSavedTheme();
          if (!saved || saved === 'system') {
            ThemeManager.applyTheme(e.matches ? 'dark' : 'light', true);
          }
        });
      }`
      : ""
  }
    }
  };

  // 立即应用主题（防止闪烁）
  ThemeManager.init();

  // 暴露到全局
  window.ThemeManager = ThemeManager;
})();
</script>`;
}

/**
 * 创建主题插件
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
 *   detectSystemPreference: true,
 *   persistTheme: true,
 * });
 * ```
 */
export function themePlugin(options: ThemePluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    defaultMode = "system",
    defaultTheme = "light",
    detectSystemPreference = true,
    persistTheme = true,
    cookieName = "theme",
    cookieExpireDays = 365,
    lightTheme = DEFAULT_LIGHT_THEME,
    darkTheme = DEFAULT_DARK_THEME,
    customThemes = [],
    cssPrefix = "theme",
    injectScript = true,
    injectSystemPreferenceScript = true,
    htmlAttribute = "data-theme",
    transitionDuration = 200,
  } = options;

  // 合并主题列表
  const themes: Map<string, ThemeDefinition> = new Map();
  themes.set("light", lightTheme);
  themes.set("dark", darkTheme);
  for (const theme of customThemes) {
    themes.set(theme.name, theme);
  }

  // 当前主题状态
  let currentTheme: string = defaultTheme;
  let currentMode: ThemeMode = defaultMode;

  return {
    name: "@dreamer/plugins-theme",
    version: "0.1.0",

    // 插件配置
    config: {
      theme: {
        defaultMode,
        defaultTheme,
        detectSystemPreference,
        persistTheme,
        cookieName,
        cookieExpireDays,
        cssPrefix,
        htmlAttribute,
        transitionDuration,
        themes: Array.from(themes.keys()),
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

      // 验证 customThemes
      if (themeConfig.customThemes) {
        if (!Array.isArray(themeConfig.customThemes)) {
          return false;
        }
        for (const theme of themeConfig.customThemes) {
          if (
            typeof theme !== "object" ||
            !theme ||
            typeof (theme as { name?: unknown }).name !== "string"
          ) {
            return false;
          }
        }
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
     * 注册主题相关服务
     */
    onInit(container: ServiceContainer) {
      // 注册主题配置服务
      container.registerSingleton("themeConfig", () => ({
        defaultMode,
        defaultTheme,
        detectSystemPreference,
        persistTheme,
        cookieName,
        cssPrefix,
        htmlAttribute,
        themes: Array.from(themes.keys()),
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
        setTheme: (themeName: string) => {
          if (themes.has(themeName)) {
            currentTheme = themeName;
          }
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
         * 获取主题定义
         */
        getTheme: (name: string) => themes.get(name),

        /**
         * 获取所有主题名称
         */
        getThemeNames: () => Array.from(themes.keys()),

        /**
         * 生成主题 CSS
         */
        generateCss: (themeName?: string) => {
          const theme = themes.get(themeName || currentTheme);
          if (!theme) return "";
          return generateCssVariables(theme, cssPrefix);
        },

        /**
         * 添加自定义主题
         */
        addTheme: (theme: ThemeDefinition) => {
          themes.set(theme.name, theme);
        },

        /**
         * 移除自定义主题
         */
        removeTheme: (name: string) => {
          if (name !== "light" && name !== "dark") {
            themes.delete(name);
          }
        },
      }));

      // 输出日志（logger 可能不存在）
      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;
      if (logger) {
        logger.info("Theme 主题插件已初始化");
        logger.info(`默认模式: ${defaultMode}`);
        logger.info(`可用主题: ${Array.from(themes.keys()).join(", ")}`);
      }
    },

    /**
     * 请求处理前钩子
     * 检测用户主题偏好
     */
    onRequest(ctx: RequestContext, _container: ServiceContainer) {
      // 从 Cookie 读取主题偏好
      if (persistTheme) {
        const cookies = ctx.cookies as
          | { get?: (name: string) => string | undefined }
          | undefined;
        const savedTheme = cookies?.get?.(cookieName);

        if (savedTheme) {
          if (savedTheme === "system") {
            currentMode = "system";
            // 系统模式下，服务端无法检测偏好，使用默认值
            currentTheme = defaultTheme;
          } else if (themes.has(savedTheme)) {
            currentTheme = savedTheme;
            currentMode = savedTheme as ThemeMode;
          }
        }
      }

      // 存储到请求上下文
      (ctx as Record<string, unknown>).theme = currentTheme;
      (ctx as Record<string, unknown>).themeMode = currentMode;
    },

    /**
     * 响应处理后钩子
     * 注入主题 CSS 和脚本
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 只在 HTML 响应中处理
      const contentType = ctx.response?.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response!.text();
        const injections: string[] = [];

        // 生成所有主题的 CSS 变量
        const themeCssBlocks: string[] = [];

        // 浅色主题（默认）
        const lightCss = generateCssVariables(lightTheme, cssPrefix);
        themeCssBlocks.push(
          `:root, [${htmlAttribute}="light"] {\n${lightCss}\n}`,
        );

        // 深色主题
        const darkCss = generateCssVariables(darkTheme, cssPrefix);
        themeCssBlocks.push(`[${htmlAttribute}="dark"] {\n${darkCss}\n}`);

        // 自定义主题
        for (const theme of customThemes) {
          const customCss = generateCssVariables(theme, cssPrefix);
          themeCssBlocks.push(
            `[${htmlAttribute}="${theme.name}"] {\n${customCss}\n}`,
          );
        }

        // 添加过渡样式
        if (transitionDuration > 0) {
          themeCssBlocks.push(`
[${htmlAttribute}] {
  color-scheme: light dark;
}
[${htmlAttribute}="light"] {
  color-scheme: light;
}
[${htmlAttribute}="dark"] {
  color-scheme: dark;
}`);
        }

        // 注入主题 CSS
        injections.push(
          `<style id="theme-variables">\n${
            themeCssBlocks.join("\n\n")
          }\n</style>`,
        );

        // 注入主题切换脚本
        if (injectScript) {
          injections.push(
            generateThemeScript({
              cookieName,
              cookieExpireDays,
              htmlAttribute,
              defaultMode,
              detectSystemPreference: detectSystemPreference &&
                injectSystemPreferenceScript,
              transitionDuration,
            }),
          );
        }

        // 注入到 </head> 之前
        if (injections.length > 0) {
          const injectionsHtml = injections.join("\n");
          let injectedHtml = html.replace(
            /<\/head>/i,
            `${injectionsHtml}\n</head>`,
          );

          // 添加初始主题属性到 <html>
          injectedHtml = injectedHtml.replace(
            /<html([^>]*)>/i,
            `<html$1 ${htmlAttribute}="${currentTheme}">`,
          );

          ctx.response = new Response(injectedHtml, {
            status: ctx.response!.status,
            statusText: ctx.response!.statusText,
            headers: ctx.response!.headers,
          });
        }
      } catch (error) {
        // 注入失败，记录错误但不影响响应
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `Theme 主题注入失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    },
  };
}

// 导出类型和常量
export { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME };
