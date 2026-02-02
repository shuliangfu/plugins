/**
 * @module @dreamer/plugins/static
 *
 * 静态文件服务插件
 *
 * 提供静态文件服务功能，支持：
 * - 静态文件目录配置
 * - MIME 类型自动检测
 * - 缓存控制
 * - ETag 支持
 * - 压缩支持
 * - 目录索引
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import {
  type DirEntry,
  type FileInfo,
  getEnv,
  readdir,
  readFile,
  stat,
} from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 静态目录配置
 */
export interface StaticDirectory {
  /** 静态文件根目录 */
  root: string;
  /** URL 前缀 */
  prefix: string;
}

/**
 * 静态文件插件配置选项
 */
export interface StaticPluginOptions {
  /** 静态文件根目录（默认 "assets"，与 statics 互斥） */
  root?: string;
  /** URL 前缀（默认 "/assets"，与 statics 互斥） */
  prefix?: string;
  /**
   * 多目录配置（优先于 root/prefix）
   * 支持配置多个静态目录，每个目录有独立的 root 和 prefix
   *
   * @example
   * ```typescript
   * staticPlugin({
   *   statics: [
   *     { root: "./assets", prefix: "/assets" },
   *     { root: "./dist/client/assets", prefix: "/client/assets/" },
   *   ],
   * });
   * ```
   */
  statics?: StaticDirectory[];
  /** 默认索引文件（默认 ["index.html"]） */
  index?: string[];
  /** 是否启用目录列表（默认 false） */
  directoryListing?: boolean;
  /**
   * 生产环境缓存控制头（默认 "public, max-age=86400"）
   * 设置为 false 禁用缓存
   */
  cacheControl?: string | false;
  /**
   * 开发环境缓存控制头（默认 "no-cache, no-store, must-revalidate"）
   * 开发环境默认禁用缓存，确保始终获取最新文件
   */
  devCacheControl?: string;
  /** 是否启用 ETag（默认 true） */
  etag?: boolean;
  /** 不缓存的文件扩展名 */
  noCacheExtensions?: string[];
  /** 是否启用压缩（默认 false，建议使用 compression 插件） */
  compress?: boolean;
  /** 自定义 MIME 类型映射 */
  mimeTypes?: Record<string, string>;
  /** 是否允许隐藏文件（默认 false） */
  allowHidden?: boolean;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 默认 MIME 类型映射
 */
const DEFAULT_MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".tar": "application/x-tar",
  ".wasm": "application/wasm",
  ".map": "application/json",
};

/**
 * 获取文件扩展名
 * @param path - 文件路径
 * @returns 扩展名（包含点号）
 */
function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (lastDot > lastSlash) {
    return path.slice(lastDot).toLowerCase();
  }
  return "";
}

/**
 * 获取 MIME 类型
 * @param path - 文件路径
 * @param customMimeTypes - 自定义 MIME 类型映射
 * @returns MIME 类型
 */
function getMimeType(
  path: string,
  customMimeTypes: Record<string, string>,
): string {
  const ext = getExtension(path);
  return customMimeTypes[ext] || DEFAULT_MIME_TYPES[ext] ||
    "application/octet-stream";
}

/**
 * 计算简单的 ETag
 * @param content - 文件内容
 * @param mtime - 修改时间
 * @returns ETag 值
 */
function computeEtag(content: Uint8Array, mtime: number): string {
  // 简单的 ETag：使用内容长度和修改时间
  return `"${content.length.toString(16)}-${mtime.toString(16)}"`;
}

/**
 * 规范化路径，防止目录遍历攻击
 * @param path - 请求路径
 * @returns 规范化后的路径
 */
function normalizePath(path: string): string {
  // 解码 URL
  const decoded = decodeURIComponent(path);

  // 移除查询字符串
  const queryIndex = decoded.indexOf("?");
  const cleanPath = queryIndex >= 0 ? decoded.slice(0, queryIndex) : decoded;

  // 规范化路径分隔符
  const normalized = cleanPath.replace(/\\/g, "/");

  // 移除 .. 和 . 部分
  const parts = normalized.split("/").filter((p) => p !== "" && p !== ".");
  const result: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      result.pop();
    } else {
      result.push(part);
    }
  }

  return "/" + result.join("/");
}

/**
 * 创建静态文件服务插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { staticPlugin } from "@dreamer/plugins/static";
 *
 * // 基础用法
 * const plugin = staticPlugin({
 *   root: "./public",
 * });
 *
 * // 自定义配置
 * const plugin = staticPlugin({
 *   root: "./dist",
 *   prefix: "/assets/",
 *   cacheControl: "public, max-age=31536000, immutable",
 *   index: ["index.html", "index.htm"],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function staticPlugin(options: StaticPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    root = "assets",
    prefix = "/assets",
    statics,
    index = ["index.html"],
    directoryListing = false,
    cacheControl = "public, max-age=86400",
    devCacheControl = "no-cache, no-store, must-revalidate",
    etag = true,
    noCacheExtensions = [".html", ".htm"],
    compress = false,
    mimeTypes = {},
    allowHidden = false,
    debug = false,
  } = options;

  // 构建目录配置列表
  // 如果配置了 statics，优先使用；否则使用 root/prefix
  const staticDirs: StaticDirectory[] = statics && statics.length > 0
    ? statics
    : [{ root, prefix }];

  // 合并 MIME 类型
  const allMimeTypes = { ...DEFAULT_MIME_TYPES, ...mimeTypes };

  /**
   * 获取当前环境的缓存控制头
   * 支持 DENO_ENV 和 BUN_ENV 环境变量，默认为 "dev"
   * 开发环境（env === "dev"）默认禁用缓存，生产环境使用配置的缓存策略
   */
  const getCacheControl = (): string | false => {
    const env = getEnv("DENO_ENV") || getEnv("BUN_ENV") || "dev";
    const isDev = env === "dev";
    return isDev ? devCacheControl : cacheControl;
  };

  return {
    name: "@dreamer/plugins-static",
    version: "1.0.0",

    // 插件配置
    config: {
      static: {
        statics: staticDirs,
        index,
        directoryListing,
        cacheControl,
        etag,
        noCacheExtensions,
        compress,
        allowHidden,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.static && typeof config.static === "object") {
        const st = config.static as Record<string, unknown>;
        // 验证 index
        if (st.index !== undefined && !Array.isArray(st.index)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册静态文件服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册静态文件配置服务
      container.registerSingleton("staticConfig", () => ({
        statics: staticDirs,
        index,
        directoryListing,
        cacheControl,
        etag,
        noCacheExtensions,
        compress,
        allowHidden,
        debug,
      }));

      // 注册静态文件服务
      container.registerSingleton("staticService", () => ({
        /**
         * 获取 MIME 类型
         * @param path - 文件路径
         * @returns MIME 类型字符串
         */
        getMimeType: (path: string) => getMimeType(path, allMimeTypes),

        /**
         * 计算 ETag
         * @param content - 文件内容
         * @param mtime - 修改时间戳
         * @returns ETag 字符串
         */
        computeEtag: (content: Uint8Array, mtime: number) =>
          computeEtag(content, mtime),

        /**
         * 规范化路径
         * @param path - 请求路径
         * @returns 规范化后的路径
         */
        normalizePath: (path: string) => normalizePath(path),
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          // 输出所有配置的静态目录
          const dirsInfo = staticDirs
            .map((d) => `${d.root} -> ${d.prefix}`)
            .join(", ");
          logger.info(`静态文件插件已初始化: statics=[${dirsInfo}]`);
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理静态文件请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      // 只处理 GET 和 HEAD 请求
      if (ctx.method !== "GET" && ctx.method !== "HEAD") {
        return;
      }

      const path = ctx.path || "/";

      // 遍历所有静态目录配置，尝试匹配
      for (const dir of staticDirs) {
        const dirRoot = dir.root;
        const dirPrefix = dir.prefix;

        // 检查路径前缀是否匹配
        if (!path.startsWith(dirPrefix)) {
          continue;
        }

        // 规范化路径（去掉前缀后的相对路径）
        const relativePath = normalizePath(path.slice(dirPrefix.length));

        // 检查目录遍历攻击（路径中包含 .. 应该已被规范化移除，
        // 但如果原始路径试图逃逸根目录，返回 403）
        const originalPath = path.slice(dirPrefix.length);
        if (originalPath.includes("..")) {
          ctx.response = new Response("Forbidden", {
            status: 403,
            headers: { "Content-Type": "text/plain" },
          });
          return;
        }

        // 检查隐藏文件
        if (
          !allowHidden &&
          (relativePath.includes("/.") || originalPath.includes("/."))
        ) {
          ctx.response = new Response("Forbidden", {
            status: 403,
            headers: { "Content-Type": "text/plain" },
          });
          return;
        }

        // 构建文件路径
        let filePath = dirRoot + relativePath;

        try {
          // 获取文件信息（使用 runtime-adapter）
          let fileStat: {
            isFile: boolean;
            isDirectory: boolean;
            mtime: Date | null;
          };

          try {
            // 使用 runtime-adapter 的 stat
            const fileInfo: FileInfo = await stat(filePath);
            fileStat = {
              isFile: fileInfo.isFile,
              isDirectory: fileInfo.isDirectory,
              mtime: fileInfo.mtime,
            };
          } catch {
            // 文件不存在，尝试下一个目录
            continue;
          }

          // 如果是目录，尝试索引文件
          if (fileStat.isDirectory) {
            for (const indexFile of index) {
              const indexPath = filePath.endsWith("/")
                ? filePath + indexFile
                : filePath + "/" + indexFile;

              try {
                const indexInfo: FileInfo = await stat(indexPath);
                if (indexInfo.isFile) {
                  filePath = indexPath;
                  fileStat = {
                    isFile: true,
                    isDirectory: false,
                    mtime: indexInfo.mtime,
                  };
                  break;
                }
              } catch {
                // 索引文件不存在，继续尝试下一个
              }
            }

            // 如果仍然是目录且允许目录列表
            if (fileStat.isDirectory) {
              if (directoryListing) {
                // 生成目录列表（使用 runtime-adapter 的 readdir）
                const dirEntries: DirEntry[] = await readdir(filePath);
                const entries: string[] = dirEntries.map((e) => e.name);

                const html = `<!DOCTYPE html>
<html>
<head><title>Index of ${relativePath}</title></head>
<body>
<h1>Index of ${relativePath}</h1>
<ul>
${entries.map((e) => `<li><a href="${e}">${e}</a></li>`).join("\n")}
</ul>
</body>
</html>`;

                ctx.response = new Response(html, {
                  status: 200,
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                });
                return;
              } else {
                // 目录但不允许列表，尝试下一个目录配置
                continue;
              }
            }
          }

          // 读取文件内容（使用 runtime-adapter 的 readFile）
          const content = await readFile(filePath);
          const mtime = fileStat.mtime?.getTime() || Date.now();

          // 检查 ETag（条件请求）
          if (etag) {
            const fileEtag = computeEtag(content, mtime);
            const ifNoneMatch = ctx.headers?.get("if-none-match");

            if (ifNoneMatch === fileEtag) {
              ctx.response = new Response(null, {
                status: 304,
                headers: { ETag: fileEtag },
              });
              return;
            }
          }

          // 构建响应头
          const headers = new Headers();
          headers.set("Content-Type", getMimeType(filePath, allMimeTypes));
          headers.set("Content-Length", content.length.toString());

          // ETag
          if (etag) {
            headers.set("ETag", computeEtag(content, mtime));
          }

          // 缓存控制（根据环境自动设置）
          const ext = getExtension(filePath);
          const currentCacheControl = getCacheControl();
          if (
            currentCacheControl !== false && !noCacheExtensions.includes(ext)
          ) {
            headers.set("Cache-Control", currentCacheControl);
          } else if (noCacheExtensions.includes(ext)) {
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
          }

          // Last-Modified
          if (fileStat.mtime) {
            headers.set("Last-Modified", fileStat.mtime.toUTCString());
          }

          // 创建响应（将 Uint8Array 转换为 ArrayBuffer）
          ctx.response = new Response(
            ctx.method === "HEAD" ? null : content.buffer as ArrayBuffer,
            {
              status: 200,
              headers,
            },
          );

          // 调试日志
          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(
                `静态文件: ${path} -> ${filePath} (${content.length} bytes)`,
              );
            }
          }

          // 找到文件，直接返回
          return;
        } catch (error) {
          // 文件读取失败，尝试下一个目录
          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(
                `静态文件读取失败: ${filePath} | ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
          // 继续尝试下一个目录
          continue;
        }
      }
      // 所有目录都没找到文件，不处理（让其他中间件处理）
    },
  };
}

// 导出默认创建函数
export default staticPlugin;
