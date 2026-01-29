/**
 * @module @dreamer/plugins/tailwindcss
 *
 * TailwindCSS v4 插件
 *
 * 提供 TailwindCSS v4 的完整支持，包括：
 * - 自动配置 PostCSS
 * - 内容扫描和样式生成
 * - 开发模式热重载
 * - 生产环境优化
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import { getEnv } from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";
import { TailwindCompiler } from "./compiler.ts";

/**
 * TailwindCSS 插件配置选项
 */
export interface TailwindPluginOptions {
  /** TailwindCSS 配置文件路径（可选，如果不提供则使用默认配置） */
  config?: string;
  /** 内容扫描路径（默认：["./src/.../*.{ts,tsx,js,jsx}"]） */
  content?: string[];
  /** CSS 入口文件路径（默认："./src/assets/tailwind.css"） */
  cssEntry?: string;
  /** 是否启用 JIT 模式（默认：true，TailwindCSS v4 默认启用） */
  jit?: boolean;
  /** 是否启用暗色模式（默认：true） */
  darkMode?: boolean | "class" | "media";
  /** 自定义主题配置（仅在无配置文件时使用） */
  theme?: Record<string, unknown>;
  /** PostCSS 插件配置 */
  postcss?: {
    /** 是否启用 autoprefixer（默认：true） */
    autoprefixer?: boolean;
    /** 是否启用压缩（生产环境，默认：true） */
    minify?: boolean;
  };
}

/**
 * 创建 TailwindCSS v4 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { tailwindPlugin } from "@dreamer/plugins/tailwindcss";
 *
 * // 基础用法（无需配置文件）
 * const plugin = tailwindPlugin({
 *   content: ["./src/.../*.{ts,tsx}"],
 * });
 *
 * // 高级用法（使用配置文件）
 * const plugin = tailwindPlugin({
 *   config: "./tailwind.config.ts",
 *   content: ["./src/.../*.{ts,tsx}"],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function tailwindPlugin(
  options: TailwindPluginOptions = {},
): Plugin {
  // 解构配置选项，设置默认值
  const {
    config,
    content = ["./src/**/*.{ts,tsx,js,jsx}"],
    cssEntry = "./src/assets/tailwind.css",
    jit = true,
    darkMode = true,
    theme = {},
    postcss = {
      autoprefixer: true,
      minify: true,
    },
  } = options;

  // CSS 编译器实例（延迟初始化）
  let compiler: TailwindCompiler | null = null;

  return {
    name: "@dreamer/plugins-tailwindcss",
    version: "0.1.0",

    // 插件配置
    config: {
      tailwind: {
        config,
        content,
        cssEntry,
        jit,
        darkMode,
        theme,
        postcss,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (pluginConfig) => {
      if (pluginConfig.tailwind && typeof pluginConfig.tailwind === "object") {
        const tailwind = pluginConfig.tailwind as Record<string, unknown>;
        if (tailwind.content && !Array.isArray(tailwind.content)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 TailwindCSS 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 判断是否为开发模式
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";

      // 注册 TailwindCSS 配置服务
      container.registerSingleton("tailwindConfig", () => ({
        config,
        content,
        cssEntry,
        jit,
        darkMode,
        theme,
        postcss,
      }));

      // 创建 CSS 编译器
      compiler = new TailwindCompiler({
        cssEntry,
        content,
        config,
        dev: isDev,
        jit,
        darkMode,
        theme,
      });

      // 注册 CSS 编译器服务
      container.registerSingleton("tailwindCompiler", () => compiler);

      // 在构建配置中集成 TailwindCSS（生产环境）
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
            framework: "tailwindcss",
            tailwind: {
              ...(config ? { config } : {}),
              content,
              jit,
              darkMode,
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
        logger.info("TailwindCSS 插件已初始化");
        logger.info(`CSS 入口: ${cssEntry}`);
        logger.info(`内容扫描: ${content.join(", ")}`);
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
          (ctx as Record<string, unknown>).tailwindCSS = compileResult.css;
        } catch (error) {
          // 编译失败，记录错误但不影响请求
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `TailwindCSS 编译失败: ${
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
          const css = (ctx as Record<string, unknown>).tailwindCSS as
            | string
            | undefined;
          if (css) {
            const styleTag = `<style id="tailwindcss-injected">${css}</style>`;
            injectedHtml = html.replace(/<\/head>/i, `  ${styleTag}\n</head>`);
          }
        } else {
          // 生产模式：注入 <link> 标签
          const cssPath = "/assets/tailwind.css";
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
  };
}

// 导出编译器（供高级用户使用）
export {
  type CSSCompileResult,
  type TailwindCompileOptions,
  TailwindCompiler,
} from "./compiler.ts";
