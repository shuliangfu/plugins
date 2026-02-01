/**
 * @module @dreamer/plugins/unocss
 *
 * UnoCSS 插件
 *
 * 提供 UnoCSS 的完整支持，包括：
 * - 自动配置 UnoCSS
 * - 预设支持（TailwindCSS 兼容模式）
 * - 图标系统支持
 * - 高性能构建
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import { getEnv } from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";
import { UnoCompiler } from "./compiler.ts";

/**
 * UnoCSS 插件配置选项
 */
export interface UnoCSSPluginOptions {
  /** UnoCSS 配置文件路径（可选，如果不提供则使用内联配置） */
  config?: string;
  /** 内容扫描路径（可选） */
  content?: string[];
  /** CSS 入口文件路径（默认："./src/assets/unocss.css"） */
  cssEntry?: string;
  /** 静态资源 URL 路径前缀（默认："/assets"） */
  assetsPath?: string;
  /** 预设列表（默认：["@unocss/preset-wind"] 用于 TailwindCSS 兼容） */
  presets?: string[];
  /** 是否启用图标系统（默认：true） */
  icons?: boolean;
  /** 图标预设（默认：["@unocss/preset-icons"]） */
  iconPresets?: string[];
  /** 自定义规则（仅在无配置文件时使用） */
  rules?: Array<[string, unknown]>;
  /** 自定义快捷方式（仅在无配置文件时使用） */
  shortcuts?: Record<string, string>;
  /** 自定义主题（仅在无配置文件时使用） */
  theme?: Record<string, unknown>;
}

/**
 * 创建 UnoCSS 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { unocssPlugin } from "@dreamer/plugins/unocss";
 *
 * // 基础用法（无需配置文件）
 * const plugin = unocssPlugin({
 *   content: ["./src/.../*.{ts,tsx}"],
 * });
 *
 * // 高级用法（使用配置文件）
 * const plugin = unocssPlugin({
 *   config: "./uno.config.ts",
 *   content: ["./src/.../*.{ts,tsx}"],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function unocssPlugin(
  options: UnoCSSPluginOptions = {},
): Plugin {
  // 解构配置选项，设置默认值
  const {
    config,
    content,
    cssEntry = "./src/assets/unocss.css",
    assetsPath = "/assets",
    presets = ["@unocss/preset-wind"],
    icons = true,
    iconPresets = ["@unocss/preset-icons"],
    rules = [],
    shortcuts = {},
    theme = {},
  } = options;

  // CSS 编译器实例（延迟初始化）
  let compiler: UnoCompiler | null = null;

  return {
    name: "@dreamer/plugins-unocss",
    version: "0.1.0",

    // 插件配置
    config: {
      unocss: {
        config,
        content,
        cssEntry,
        assetsPath,
        presets,
        icons,
        iconPresets,
        rules,
        shortcuts,
        theme,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (pluginConfig) => {
      if (pluginConfig.unocss && typeof pluginConfig.unocss === "object") {
        const unocss = pluginConfig.unocss as Record<string, unknown>;
        if (unocss.content && !Array.isArray(unocss.content)) {
          return false;
        }
        if (unocss.presets && !Array.isArray(unocss.presets)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 UnoCSS 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 判断是否为开发模式
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";

      // 注册 UnoCSS 配置服务
      container.registerSingleton("unocssConfig", () => ({
        config,
        content,
        cssEntry,
        presets,
        icons,
        iconPresets,
        rules,
        shortcuts,
        theme,
      }));

      // 创建 CSS 编译器
      compiler = new UnoCompiler({
        cssEntry,
        content,
        config,
        dev: isDev,
        presets,
        icons,
        iconPresets,
        rules,
        shortcuts,
        theme,
      });

      // 注册 CSS 编译器服务
      container.registerSingleton("unocssCompiler", () => compiler);

      // 在构建配置中集成 UnoCSS（生产环境）
      if (!isDev && container.has("config")) {
        const buildConfig = container.get<Record<string, unknown>>("config");
        if (buildConfig && typeof buildConfig === "object") {
          const appConfig = buildConfig as Record<string, unknown>;
          if (!appConfig.build) {
            appConfig.build = {};
          }
          const build = appConfig.build as Record<string, unknown>;
          if (!build.assets) {
            build.assets = {};
          }
          const assets = build.assets as Record<string, unknown>;
          assets.css = {
            ...(assets.css as Record<string, unknown> || {}),
            framework: "unocss",
            unocss: {
              ...(config ? { config } : {}),
              content,
              presets,
              icons,
              iconPresets,
              ...(rules.length > 0 ? { rules } : {}),
              ...(Object.keys(shortcuts).length > 0 ? { shortcuts } : {}),
              ...(Object.keys(theme).length > 0 ? { theme } : {}),
            },
          };
        }
      }

      // 输出日志（logger 可能不存在）
      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;
      if (logger) {
        logger.info("UnoCSS 插件已初始化");
        logger.info(`CSS 入口: ${cssEntry}`);
        if (content && content.length > 0) {
          logger.info(`内容扫描: ${content.join(", ")}`);
        }
        logger.info(`预设: ${presets.join(", ")}`);
      }
    },

    /**
     * 请求处理前钩子
     * 开发模式下编译 CSS
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";

      // 只在开发模式下编译 CSS
      if (isDev && compiler) {
        try {
          // 在请求时编译 CSS，将结果存储到上下文中
          const compileResult = await compiler.compile();
          (ctx as Record<string, unknown>).unocssCSS = compileResult.css;
        } catch (error) {
          // 编译失败，记录错误但不影响请求
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `UnoCSS 编译失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }
    },

    /**
     * 响应处理后钩子
     * 注入 CSS 标签
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";

      // 只在 HTML 响应中注入 CSS
      const contentType = ctx.response?.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response!.text();
        let injectedHtml = html;

        if (isDev) {
          // 开发模式：注入 <style> 标签
          const css = (ctx as Record<string, unknown>).unocssCSS as
            | string
            | undefined;
          if (css) {
            const styleTag = `<style id="unocss-injected">${css}</style>`;
            injectedHtml = html.replace(/<\/head>/i, `  ${styleTag}\n</head>`);
          }
        } else {
          // 生产模式：注入 <link> 标签（使用 hash 文件名）
          // 从编译器获取 hash 文件名
          const compilerResult = compiler?.getLastResult();
          const filename = compilerResult?.filename || "unocss.css";
          // 确保 assetsPath 以 / 开头但不以 / 结尾
          const normalizedPath = assetsPath.startsWith("/")
            ? assetsPath
            : `/${assetsPath}`;
          const cssPath = `${normalizedPath.replace(/\/$/, "")}/${filename}`;
          const linkTag = `<link rel="stylesheet" href="${cssPath}">`;
          injectedHtml = html.replace(/<\/head>/i, `  ${linkTag}\n</head>`);
        }

        ctx.response = new Response(injectedHtml, {
          status: ctx.response!.status,
          statusText: ctx.response!.statusText,
          headers: ctx.response!.headers,
        });
      } catch (error) {
        // 注入失败，记录错误但不影响响应
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `CSS 注入失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    },

    /**
     * 构建钩子
     * 编译 CSS 并将结果存储到服务容器供构建系统使用
     */
    async onBuild(
      _options: Record<string, unknown>,
      container: ServiceContainer,
    ): Promise<void> {
      if (!compiler) {
        return;
      }

      try {
        // 编译 CSS
        const result = await compiler.compile();

        // 将编译结果存储到服务容器，供构建系统使用
        // 构建系统可通过 container.get("unocssBuildResult") 获取
        container.registerSingleton("unocssBuildResult", () => result);

        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger && result.filename) {
          logger.info(`UnoCSS 编译完成: ${result.filename}`);
          logger.info(`CSS 大小: ${result.css.length} 字符`);
        }
      } catch (error) {
        console.error("[UnoCSS] 构建编译失败:", error);
      }
    },
  };
}

// 导出编译器（供高级用户使用）
export {
  type CSSCompileResult,
  type UnoCompileOptions,
  UnoCompiler,
} from "./compiler.ts";
