/**
 * @module @dreamer/plugins/cors
 *
 * CORS（跨域资源共享）插件
 *
 * 提供 CORS 支持，包括：
 * - 配置允许的源（Origin）
 * - 配置允许的方法
 * - 配置允许的头部
 * - 预检请求处理
 * - 凭证支持
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * CORS 插件配置选项
 */
export interface CorsPluginOptions {
  /** 允许的源（默认 "*"，允许所有） */
  origin?: string | string[] | ((origin: string) => boolean);
  /** 允许的 HTTP 方法（默认 ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]） */
  methods?: string[];
  /** 允许的请求头（默认 ["Content-Type", "Authorization"]） */
  allowedHeaders?: string[];
  /** 暴露给客户端的响应头 */
  exposedHeaders?: string[];
  /** 是否允许凭证（默认 false） */
  credentials?: boolean;
  /** 预检请求缓存时间（秒，默认 86400） */
  maxAge?: number;
  /** 预检请求成功状态码（默认 204） */
  optionsSuccessStatus?: number;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 默认允许的 HTTP 方法
 */
const DEFAULT_METHODS = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"];

/**
 * 默认允许的请求头
 */
const DEFAULT_ALLOWED_HEADERS = ["Content-Type", "Authorization"];

/**
 * 检查源是否被允许
 * @param requestOrigin - 请求的源
 * @param allowedOrigin - 配置的允许源
 * @returns 是否允许
 */
function isOriginAllowed(
  requestOrigin: string,
  allowedOrigin: string | string[] | ((origin: string) => boolean),
): boolean {
  if (allowedOrigin === "*") {
    return true;
  }

  if (typeof allowedOrigin === "function") {
    return allowedOrigin(requestOrigin);
  }

  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.includes(requestOrigin);
  }

  return requestOrigin === allowedOrigin;
}

/**
 * 获取允许的源值
 * @param requestOrigin - 请求的源
 * @param allowedOrigin - 配置的允许源
 * @param credentials - 是否允许凭证
 * @returns Access-Control-Allow-Origin 的值
 */
function getAllowedOrigin(
  requestOrigin: string | null,
  allowedOrigin: string | string[] | ((origin: string) => boolean),
  credentials: boolean,
): string | null {
  // 如果没有请求源，不添加 CORS 头
  if (!requestOrigin) {
    return null;
  }

  // 检查源是否被允许
  if (!isOriginAllowed(requestOrigin, allowedOrigin)) {
    return null;
  }

  // 如果允许凭证，不能使用 "*"，必须返回具体的源
  if (credentials) {
    return requestOrigin;
  }

  // 如果配置是 "*"，返回 "*"
  if (allowedOrigin === "*") {
    return "*";
  }

  // 否则返回请求的源
  return requestOrigin;
}

/**
 * 创建 CORS 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { corsPlugin } from "@dreamer/plugins/cors";
 *
 * // 允许所有源
 * const plugin = corsPlugin();
 *
 * // 允许特定源
 * const plugin = corsPlugin({
 *   origin: ["https://example.com", "https://app.example.com"],
 *   credentials: true,
 * });
 *
 * // 使用函数动态判断
 * const plugin = corsPlugin({
 *   origin: (origin) => origin.endsWith(".example.com"),
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function corsPlugin(options: CorsPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    origin = "*",
    methods = DEFAULT_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
    optionsSuccessStatus = 204,
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-cors",
    version: "1.0.0",

    // 插件配置
    config: {
      cors: {
        origin,
        methods,
        allowedHeaders,
        exposedHeaders,
        credentials,
        maxAge,
        optionsSuccessStatus,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.cors && typeof config.cors === "object") {
        const cors = config.cors as Record<string, unknown>;
        // 验证 methods
        if (cors.methods !== undefined && !Array.isArray(cors.methods)) {
          return false;
        }
        // 验证 maxAge
        if (
          cors.maxAge !== undefined &&
          (typeof cors.maxAge !== "number" || cors.maxAge < 0)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 CORS 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册 CORS 配置服务
      container.registerSingleton("corsConfig", () => ({
        origin,
        methods,
        allowedHeaders,
        exposedHeaders,
        credentials,
        maxAge,
        optionsSuccessStatus,
        debug,
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          const originStr = typeof origin === "function"
            ? "<function>"
            : Array.isArray(origin)
            ? origin.join(", ")
            : origin;
          logger.info(
            `CORS 插件已初始化: origin=${originStr}, credentials=${credentials}`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理预检请求（OPTIONS）
     */
    onRequest(ctx: RequestContext, container: ServiceContainer) {
      const requestOrigin = ctx.headers?.get("origin") || null;
      const requestMethod = ctx.method?.toUpperCase();

      // 获取允许的源
      const allowedOriginValue = getAllowedOrigin(
        requestOrigin,
        origin,
        credentials,
      );

      // 如果是预检请求（OPTIONS）
      if (requestMethod === "OPTIONS") {
        const headers = new Headers();

        // 设置 CORS 头
        if (allowedOriginValue) {
          headers.set("Access-Control-Allow-Origin", allowedOriginValue);
        }

        // 允许的方法
        headers.set("Access-Control-Allow-Methods", methods.join(", "));

        // 允许的头部
        const requestedHeaders = ctx.headers?.get(
          "access-control-request-headers",
        );
        if (requestedHeaders) {
          // 如果客户端请求了特定头部，检查是否允许
          headers.set("Access-Control-Allow-Headers", requestedHeaders);
        } else {
          headers.set(
            "Access-Control-Allow-Headers",
            allowedHeaders.join(", "),
          );
        }

        // 凭证
        if (credentials) {
          headers.set("Access-Control-Allow-Credentials", "true");
        }

        // 缓存时间
        headers.set("Access-Control-Max-Age", maxAge.toString());

        // 设置预检响应
        ctx.response = new Response(null, {
          status: optionsSuccessStatus,
          headers,
        });

        // 调试日志
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `CORS 预检请求: ${ctx.path} | origin=${requestOrigin} | allowed=${
                allowedOriginValue !== null
              }`,
            );
          }
        }

        // 返回，不继续处理
        return;
      }
    },

    /**
     * 响应处理后钩子
     * 添加 CORS 头到响应
     */
    onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 检查是否有响应
      if (!ctx.response) return;

      const requestOrigin = ctx.headers?.get("origin") || null;

      // 获取允许的源
      const allowedOriginValue = getAllowedOrigin(
        requestOrigin,
        origin,
        credentials,
      );

      // 如果源不被允许，不添加 CORS 头
      if (!allowedOriginValue) return;

      // 创建新的响应头
      const headers = new Headers(ctx.response.headers);

      // 设置 CORS 头
      headers.set("Access-Control-Allow-Origin", allowedOriginValue);

      // 凭证
      if (credentials) {
        headers.set("Access-Control-Allow-Credentials", "true");
      }

      // 暴露的头部
      if (exposedHeaders.length > 0) {
        headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
      }

      // 添加 Vary 头
      const vary = headers.get("Vary");
      if (vary) {
        if (!vary.toLowerCase().includes("origin")) {
          headers.set("Vary", `${vary}, Origin`);
        }
      } else {
        headers.set("Vary", "Origin");
      }

      // 创建新的响应
      ctx.response = new Response(ctx.response.body, {
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
          logger.info(
            `CORS 响应: ${ctx.path} | origin=${requestOrigin} | allowed-origin=${allowedOriginValue}`,
          );
        }
      }
    },
  };
}

// 导出默认创建函数
export default corsPlugin;
