/**
 * @module @dreamer/plugins/compression
 *
 * 响应压缩插件
 *
 * 提供 HTTP 响应压缩功能，支持：
 * - Gzip 压缩
 * - Deflate 压缩
 * - 自动检测 Accept-Encoding
 * - 可配置压缩阈值
 * - MIME 类型过滤
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 压缩插件配置选项
 */
export interface CompressionPluginOptions {
  /** 压缩级别（1-9，默认 6） */
  level?: number;
  /** 最小压缩阈值（字节，默认 1024） */
  threshold?: number;
  /** 启用的压缩算法（默认 ["gzip", "deflate"]） */
  encodings?: Array<"gzip" | "deflate">;
  /** 需要压缩的 MIME 类型（默认包含 text/*、application/json 等） */
  mimeTypes?: string[];
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 默认需要压缩的 MIME 类型
 */
const DEFAULT_MIME_TYPES = [
  "text/html",
  "text/css",
  "text/plain",
  "text/xml",
  "text/javascript",
  "application/json",
  "application/javascript",
  "application/xml",
  "application/xhtml+xml",
  "application/rss+xml",
  "application/atom+xml",
  "image/svg+xml",
];

/**
 * 检查内容类型是否应该被压缩
 * @param contentType - Content-Type 头
 * @param mimeTypes - 允许压缩的 MIME 类型列表
 * @returns 是否应该压缩
 */
function shouldCompress(
  contentType: string | null,
  mimeTypes: string[],
): boolean {
  if (!contentType) return false;

  // 提取 MIME 类型（去掉 charset 等参数）
  const mime = contentType.split(";")[0].trim().toLowerCase();

  return mimeTypes.some((type) => {
    if (type.endsWith("/*")) {
      // 通配符匹配，如 text/*
      const prefix = type.slice(0, -1);
      return mime.startsWith(prefix);
    }
    return mime === type;
  });
}

/**
 * 获取客户端首选的压缩编码
 * @param acceptEncoding - Accept-Encoding 头
 * @param supportedEncodings - 服务器支持的编码列表
 * @returns 首选编码或 null
 */
function getPreferredEncoding(
  acceptEncoding: string | null,
  supportedEncodings: Array<"gzip" | "deflate">,
): "gzip" | "deflate" | null {
  if (!acceptEncoding) return null;

  const encodings = acceptEncoding.toLowerCase();

  // 按优先级检查
  for (const encoding of supportedEncodings) {
    if (encodings.includes(encoding)) {
      return encoding;
    }
  }

  return null;
}

/**
 * 使用 Gzip 压缩数据
 * @param data - 要压缩的数据
 * @param level - 压缩级别
 * @returns 压缩后的数据
 */
async function compressGzip(
  data: Uint8Array,
  _level: number,
): Promise<Uint8Array> {
  // 使用 Web Streams API 的 CompressionStream
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  // 创建副本以避免类型问题
  await writer.write(data.slice());
  await writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // 合并所有 chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * 使用 Deflate 压缩数据
 * @param data - 要压缩的数据
 * @param level - 压缩级别
 * @returns 压缩后的数据
 */
async function compressDeflate(
  data: Uint8Array,
  _level: number,
): Promise<Uint8Array> {
  // 使用 Web Streams API 的 CompressionStream
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  // 创建副本以避免类型问题
  await writer.write(data.slice());
  await writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // 合并所有 chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * 创建压缩插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { compressionPlugin } from "@dreamer/plugins/compression";
 *
 * const plugin = compressionPlugin({
 *   level: 6,
 *   threshold: 1024,
 *   encodings: ["gzip", "deflate"],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function compressionPlugin(
  options: CompressionPluginOptions = {},
): Plugin {
  // 解构配置选项，设置默认值
  const {
    level = 6,
    threshold = 1024,
    encodings = ["gzip", "deflate"],
    mimeTypes = DEFAULT_MIME_TYPES,
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-compression",
    version: "1.0.0",

    // 插件配置
    config: {
      compression: {
        level,
        threshold,
        encodings,
        mimeTypes,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.compression && typeof config.compression === "object") {
        const comp = config.compression as Record<string, unknown>;
        // 验证压缩级别
        if (
          comp.level !== undefined &&
          (typeof comp.level !== "number" || comp.level < 1 || comp.level > 9)
        ) {
          return false;
        }
        // 验证阈值
        if (
          comp.threshold !== undefined &&
          (typeof comp.threshold !== "number" || comp.threshold < 0)
        ) {
          return false;
        }
        // 验证编码列表
        if (comp.encodings !== undefined && !Array.isArray(comp.encodings)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册压缩服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册压缩配置服务
      container.registerSingleton("compressionConfig", () => ({
        level,
        threshold,
        encodings,
        mimeTypes,
        debug,
      }));

      // 注册压缩服务
      container.registerSingleton("compressionService", () => ({
        /**
         * 压缩数据
         * @param data - 要压缩的数据
         * @param encoding - 压缩编码
         * @returns 压缩后的数据
         */
        compress: async (
          data: Uint8Array,
          encoding: "gzip" | "deflate",
        ): Promise<Uint8Array> => {
          if (encoding === "gzip") {
            return await compressGzip(data, level);
          } else {
            return await compressDeflate(data, level);
          }
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `压缩插件已初始化: level=${level}, threshold=${threshold}, encodings=${
              encodings.join(",")
            }`,
          );
        }
      }
    },

    /**
     * 响应处理后钩子
     * 压缩响应内容
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 检查是否有响应
      if (!ctx.response) return;

      // 获取请求的 Accept-Encoding
      const acceptEncoding = ctx.headers?.get("accept-encoding") || null;

      // 获取客户端首选的压缩编码
      const encoding = getPreferredEncoding(acceptEncoding, encodings);
      if (!encoding) return;

      // 检查响应是否已经被压缩
      const contentEncoding = ctx.response.headers.get("content-encoding");
      if (contentEncoding) return;

      // 检查 Content-Type 是否应该被压缩
      const contentType = ctx.response.headers.get("content-type");
      if (!shouldCompress(contentType, mimeTypes)) return;

      try {
        // 获取响应体
        const body = await ctx.response.arrayBuffer();
        const data = new Uint8Array(body);

        // 检查是否达到压缩阈值
        if (data.length < threshold) return;

        // 获取压缩服务
        const compressionService = container.get<{
          compress: (
            data: Uint8Array,
            encoding: "gzip" | "deflate",
          ) => Promise<Uint8Array>;
        }>("compressionService");

        if (!compressionService) return;

        // 压缩数据
        const compressed = await compressionService.compress(data, encoding);

        // 如果压缩后更大，不使用压缩
        if (compressed.length >= data.length) {
          // 重新创建响应（因为已经读取了 body）
          ctx.response = new Response(data, {
            status: ctx.response.status,
            statusText: ctx.response.statusText,
            headers: ctx.response.headers,
          });
          return;
        }

        // 创建新的响应头
        const headers = new Headers(ctx.response.headers);
        headers.set("Content-Encoding", encoding);
        headers.set("Content-Length", compressed.length.toString());
        // 添加 Vary 头，告诉缓存根据 Accept-Encoding 区分
        const vary = headers.get("Vary");
        if (vary) {
          if (!vary.toLowerCase().includes("accept-encoding")) {
            headers.set("Vary", `${vary}, Accept-Encoding`);
          }
        } else {
          headers.set("Vary", "Accept-Encoding");
        }

        // 创建压缩后的响应
        ctx.response = new Response(compressed.buffer as ArrayBuffer, {
          status: ctx.response.status,
          statusText: ctx.response.statusText,
          headers,
        });

        // 调试日志
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            const ratio = ((1 - compressed.length / data.length) * 100).toFixed(
              1,
            );
            logger.info(
              `压缩响应: ${ctx.path} | ${encoding} | ${data.length} -> ${compressed.length} bytes (${ratio}% 压缩率)`,
            );
          }
        }
      } catch (error) {
        // 压缩失败时记录错误但不影响响应
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `压缩失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }
    },
  };
}

// 导出默认创建函数
export default compressionPlugin;
