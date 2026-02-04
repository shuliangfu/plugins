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
import {
    basename,
    cwd,
    getEnv,
    join,
    mkdir,
    readdir,
    writeTextFile,
} from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";
import { TailwindCompiler } from "./compiler.ts";

/**
 * TailwindCSS 插件配置选项
 */
export interface TailwindPluginOptions {
  /** 编译输出目录（必传），CSS 文件将直接写入此目录（相对 cwd 或绝对路径） */
  output: string;
  /** TailwindCSS 配置文件路径（可选，如果不提供则使用默认配置） */
  config?: string;
  /** 内容扫描路径（可选，TailwindCSS v4 可在 CSS 中使用 @source 指令） */
  content?: string[];
  /** CSS 入口文件路径（默认："./src/assets/tailwind.css"） */
  cssEntry?: string;
  /** 静态资源 URL 路径前缀（默认："/assets"），仅用于生产模式 link href */
  assetsPath?: string;
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
 * // 基础用法（必传 output）
 * const plugin = tailwindPlugin({
 *   output: "dist/client/assets",
 *   content: ["./src/.../*.{ts,tsx}"],
 * });
 *
 * // 高级用法（使用配置文件）
 * const plugin = tailwindPlugin({
 *   output: "dist/client/assets",
 *   config: "./tailwind.config.ts",
 *   content: ["./src/.../*.{ts,tsx}"],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function tailwindPlugin(options: TailwindPluginOptions): Plugin {
  // 解构配置选项，output 必传
  const {
    output,
    config,
    content,
    cssEntry = "./src/assets/tailwind.css",
    assetsPath = "/assets",
    jit = true,
    darkMode = true,
    theme = {},
    postcss = {
      autoprefixer: true,
      minify: true,
    },
  } = options;

  /** 将 output 解析为绝对路径（相对 cwd） */
  const resolveOutputDir = (): string =>
    output.startsWith("/") ? output : join(cwd(), output);

  // CSS 编译器实例（延迟初始化）
  let compiler: TailwindCompiler | null = null;

  // 生产模式下缓存的 CSS 文件名（通过扫描目录获取）
  let cachedCssFilename: string | null = null;

  // 从 cssEntry 提取基础文件名（用于扫描目录匹配）
  // 例如：src/assets/tailwind.css -> tailwind
  // 例如：src/assets/main.css -> main
  const cssEntryBasename = basename(cssEntry, ".css");

  /**
   * 扫描目录找到匹配的 CSS 文件
   * 生产模式下使用，因为编译器实例在构建后不保留结果
   *
   * @param assetsDir CSS 资源目录
   * @returns CSS 文件名或 null
   */
  async function findCssFile(assetsDir: string): Promise<string | null> {
    try {
      const entries = await readdir(assetsDir);
      for (const entry of entries) {
        // 匹配 {cssEntryBasename}.*.css 或 {cssEntryBasename}.css
        // 例如：tailwind.a1b2c3.css 或 main.a1b2c3.css
        if (
          entry.isFile &&
          entry.name.startsWith(cssEntryBasename) &&
          entry.name.endsWith(".css")
        ) {
          return entry.name;
        }
      }
    } catch {
      // 目录不存在或无法读取，忽略
    }
    return null;
  }

  return {
    name: "@dreamer/plugins-tailwindcss",
    version: "0.1.0",

    // 插件配置
    config: {
      tailwind: {
        config,
        content,
        cssEntry,
        assetsPath,
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

      // 注册 TailwindCSS 配置服务（含 assetsPath，供 dweb 生成 client 时计算 HMR CSS URL）
      container.registerSingleton("tailwindConfig", () => ({
        config,
        content,
        cssEntry,
        assetsPath,
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
    },

    /**
     * 请求处理前钩子
     * 开发模式下：若请求路径为 assetsPath/tailwind.css 则直接返回编译后的 CSS（供 HMR 拉取）；
     * 否则在请求时编译 CSS 并存入上下文供 onResponse 注入。
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";

      if (!isDev || !compiler) return;

      // 开发态下用于 HMR 的 CSS 请求路径：/assets/tailwind.css（与 main 中 assetsPath + 入口文件名一致）
      const normalizedAssets = assetsPath.startsWith("/")
        ? assetsPath.replace(/\/$/, "")
        : `/${assetsPath.replace(/\/$/, "")}`;
      const devCssPath = `${normalizedAssets}/${cssEntryBasename}.css`;

      const pathname = ctx.url?.pathname ?? ctx.path ?? "";
      const isGetCss = (ctx.method === "GET" || ctx.method === "get") &&
        pathname === devCssPath;

      if (isGetCss) {
        try {
          const compileResult = await compiler.compile();
          return new Response(compileResult.css, {
            status: 200,
            headers: { "Content-Type": "text/css" },
          });
        } catch (error) {
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
          return new Response("/* Tailwind compile error */", {
            status: 500,
            headers: { "Content-Type": "text/css" },
          });
        }
      }

      try {
        const compileResult = await compiler.compile();
        (ctx as Record<string, unknown>).tailwindCSS = compileResult.css;
      } catch (error) {
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
          // 开发模式：注入 <style> 标签（HMR 时 client 从容器配置得到的 URL 拉取最新 CSS）
          const css = (ctx as Record<string, unknown>).tailwindCSS as
            | string
            | undefined;
          if (css) {
            const styleTag = `<style id="tailwindcss-injected">${css}</style>`;
            injectedHtml = html.replace(/<\/head>/i, `  ${styleTag}\n</head>`);
          }
        } else {
          // 生产模式：注入 <link> 标签（使用 hash 文件名）
          // 通过扫描目录获取 CSS 文件名（只扫描一次，后续使用缓存）
          if (!cachedCssFilename) {
            // 构建 CSS 资源目录：优先使用 dweb 注册的 clientAssetsDir，否则使用插件配置的 output
            const assetsDir = container.tryGet<string>("clientAssetsDir") ??
              resolveOutputDir();
            cachedCssFilename = await findCssFile(assetsDir);
          }
          const filename = cachedCssFilename || `${cssEntryBasename}.css`;

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
     * 编译 CSS 并直接写入插件配置的 output 目录
     */
    async onBuild(
      _options: Record<string, unknown>,
      container: ServiceContainer,
    ): Promise<void> {
      if (!compiler) {
        return;
      }

      const logger = container.tryGet<{ info: (msg: string) => void }>(
        "logger",
      );

      try {
        const result = await compiler.compile();
        if (!result.filename) {
          return;
        }
        const outDir = resolveOutputDir();
        await mkdir(outDir, { recursive: true });
        await writeTextFile(join(outDir, result.filename), result.css);
        // 供 dweb SSG 模板内联样式使用（可选）
        container.tryGet<string[]>("pluginBuildCssParts")?.push(result.css);

        if (logger) {
          logger.info(`TailwindCSS 编译完成: ${result.filename}`);
          logger.info(`CSS 大小: ${result.css.length} 字符`);
        }
      } catch (error) {
        console.error("[TailwindCSS] 构建编译失败:", error);
      }
    },
  };
}

// 导出编译器（供高级用户使用）
export {
    TailwindCompiler, type CSSCompileResult,
    type TailwindCompileOptions
} from "./compiler.ts";

