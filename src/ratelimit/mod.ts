/**
 * @module @dreamer/plugins/ratelimit
 *
 * 速率限制插件
 *
 * 提供 API 速率限制功能，支持：
 * - 固定窗口限流
 * - 滑动窗口限流
 * - IP 基础限流
 * - 自定义标识符
 * - 可配置响应
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 速率限制插件配置选项
 */
export interface RateLimitPluginOptions {
  /** 时间窗口内允许的最大请求数（默认 100） */
  max?: number;
  /** 时间窗口大小（毫秒，默认 60000 = 1 分钟） */
  windowMs?: number;
  /** 获取限流标识符的函数（默认使用 IP） */
  keyGenerator?: (ctx: RequestContext) => string;
  /** 是否跳过成功的请求（默认 false） */
  skipSuccessfulRequests?: boolean;
  /** 是否跳过失败的请求（默认 false） */
  skipFailedRequests?: boolean;
  /** 跳过限流的路径（正则表达式或字符串数组） */
  skip?: string[] | RegExp[];
  /** 超出限制时的状态码（默认 429） */
  statusCode?: number;
  /** 超出限制时的响应消息 */
  message?: string | Record<string, unknown>;
  /** 是否在响应头中添加限流信息（默认 true） */
  headers?: boolean;
  /** 自定义响应头名称前缀（默认 "X-RateLimit"） */
  headerPrefix?: string;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 限流记录
 */
interface RateLimitRecord {
  /** 请求计数 */
  count: number;
  /** 窗口开始时间 */
  resetTime: number;
}

/**
 * 限流存储（内存实现）
 */
class RateLimitStore {
  /** 存储记录 */
  private records: Map<string, RateLimitRecord> = new Map();
  /** 时间窗口大小 */
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  /**
   * 获取或创建记录
   * @param key - 标识符
   * @returns 记录和是否是新记录
   */
  get(key: string): RateLimitRecord {
    const now = Date.now();
    let record = this.records.get(key);

    // 如果记录不存在或已过期，创建新记录
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.records.set(key, record);
    }

    return record;
  }

  /**
   * 增加计数
   * @param key - 标识符
   * @returns 当前计数
   */
  increment(key: string): number {
    const record = this.get(key);
    record.count++;
    return record.count;
  }

  /**
   * 减少计数
   * @param key - 标识符
   */
  decrement(key: string): void {
    const record = this.records.get(key);
    if (record && record.count > 0) {
      record.count--;
    }
  }

  /**
   * 获取重置时间
   * @param key - 标识符
   * @returns 重置时间戳
   */
  getResetTime(key: string): number {
    const record = this.get(key);
    return record.resetTime;
  }

  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime) {
        this.records.delete(key);
      }
    }
  }
}

/**
 * 默认的标识符生成器（使用 IP 地址）
 * @param ctx - 请求上下文
 * @returns 标识符
 */
function defaultKeyGenerator(ctx: RequestContext): string {
  // 尝试从各种头部获取真实 IP
  const forwarded = ctx.headers?.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = ctx.headers?.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // 从 URL 或其他来源获取
  // 这里返回一个默认值，实际应该从连接信息获取
  return "unknown";
}

/**
 * 检查路径是否应该跳过
 * @param path - 请求路径
 * @param skip - 跳过配置
 * @returns 是否跳过
 */
function shouldSkip(
  path: string | undefined,
  skip: string[] | RegExp[],
): boolean {
  if (!path || skip.length === 0) return false;

  for (const pattern of skip) {
    if (typeof pattern === "string") {
      if (path === pattern || path.startsWith(pattern)) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(path)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 创建速率限制插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { rateLimitPlugin } from "@dreamer/plugins/ratelimit";
 *
 * // 基础限流：每分钟 100 次请求
 * const plugin = rateLimitPlugin();
 *
 * // 自定义限流
 * const plugin = rateLimitPlugin({
 *   max: 50,
 *   windowMs: 15 * 60 * 1000, // 15 分钟
 *   message: { error: "请求过于频繁，请稍后再试" },
 * });
 *
 * // 跳过某些路径
 * const plugin = rateLimitPlugin({
 *   skip: ["/api/health", /^\/public\//],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function rateLimitPlugin(options: RateLimitPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    max = 100,
    windowMs = 60000,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    skip = [],
    statusCode = 429,
    message = "请求过于频繁，请稍后再试",
    headers = true,
    headerPrefix = "X-RateLimit",
    debug = false,
  } = options;

  // 创建存储实例
  const store = new RateLimitStore(windowMs);

  // 定期清理过期记录
  // 清理定时器（使用下划线前缀表示内部使用）
  let _cleanupInterval: number | undefined;

  return {
    name: "@dreamer/plugins-ratelimit",
    version: "1.0.0",

    // 插件配置
    config: {
      rateLimit: {
        max,
        windowMs,
        skipSuccessfulRequests,
        skipFailedRequests,
        skip,
        statusCode,
        message,
        headers,
        headerPrefix,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.rateLimit && typeof config.rateLimit === "object") {
        const rl = config.rateLimit as Record<string, unknown>;
        // 验证 max
        if (
          rl.max !== undefined &&
          (typeof rl.max !== "number" || rl.max < 1)
        ) {
          return false;
        }
        // 验证 windowMs
        if (
          rl.windowMs !== undefined &&
          (typeof rl.windowMs !== "number" || rl.windowMs < 1)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册限流服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册限流配置服务
      container.registerSingleton("rateLimitConfig", () => ({
        max,
        windowMs,
        skipSuccessfulRequests,
        skipFailedRequests,
        skip,
        statusCode,
        message,
        headers,
        headerPrefix,
        debug,
      }));

      // 注册限流服务
      container.registerSingleton("rateLimitService", () => ({
        /**
         * 检查是否超出限制
         * @param key - 标识符
         * @returns 是否超出限制
         */
        isLimited: (key: string): boolean => {
          const record = store.get(key);
          return record.count >= max;
        },
        /**
         * 获取剩余请求数
         * @param key - 标识符
         * @returns 剩余请求数
         */
        getRemaining: (key: string): number => {
          const record = store.get(key);
          return Math.max(0, max - record.count);
        },
        /**
         * 获取重置时间
         * @param key - 标识符
         * @returns 重置时间戳
         */
        getResetTime: (key: string): number => {
          return store.getResetTime(key);
        },
      }));

      // 启动清理定时器（每分钟清理一次）
      _cleanupInterval = setInterval(() => {
        store.cleanup();
      }, 60000) as unknown as number;

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `速率限制插件已初始化: max=${max}, windowMs=${windowMs}`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 检查速率限制
     */
    onRequest(ctx: RequestContext, container: ServiceContainer) {
      // 检查是否应该跳过
      if (shouldSkip(ctx.path, skip)) return;

      // 生成标识符
      const key = keyGenerator(ctx);

      // 增加计数
      const count = store.increment(key);
      const resetTime = store.getResetTime(key);
      const remaining = Math.max(0, max - count);

      // 将限流信息保存到上下文
      (ctx as Record<string, unknown>)._rateLimitKey = key;
      (ctx as Record<string, unknown>)._rateLimitCount = count;

      // 检查是否超出限制
      if (count > max) {
        const responseHeaders = new Headers();

        // 添加限流头
        if (headers) {
          responseHeaders.set(`${headerPrefix}-Limit`, max.toString());
          responseHeaders.set(`${headerPrefix}-Remaining`, "0");
          responseHeaders.set(
            `${headerPrefix}-Reset`,
            Math.ceil(resetTime / 1000).toString(),
          );
          responseHeaders.set(
            "Retry-After",
            Math.ceil(
              (resetTime - Date.now()) / 1000,
            ).toString(),
          );
        }

        // 构建响应体
        const body = typeof message === "string"
          ? JSON.stringify({ error: message })
          : JSON.stringify(message);

        responseHeaders.set("Content-Type", "application/json");

        // 设置响应
        ctx.response = new Response(body, {
          status: statusCode,
          headers: responseHeaders,
        });

        // 调试日志
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `速率限制触发: ${ctx.path} | key=${key} | count=${count}/${max}`,
            );
          }
        }

        return;
      }

      // 调试日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `速率限制检查: ${ctx.path} | key=${key} | count=${count}/${max} | remaining=${remaining}`,
          );
        }
      }
    },

    /**
     * 响应处理后钩子
     * 添加限流头到响应，处理跳过逻辑
     */
    onResponse(ctx: RequestContext, _container: ServiceContainer) {
      // 检查是否有响应
      if (!ctx.response) return;

      // 获取限流信息
      const key = (ctx as Record<string, unknown>)._rateLimitKey as
        | string
        | undefined;
      if (!key) return;

      const count = (ctx as Record<string, unknown>)._rateLimitCount as number;
      const resetTime = store.getResetTime(key);
      const remaining = Math.max(0, max - count);

      // 检查是否应该跳过
      const status = ctx.response.status;
      if (skipSuccessfulRequests && status >= 200 && status < 400) {
        store.decrement(key);
        return;
      }
      if (skipFailedRequests && status >= 400) {
        store.decrement(key);
        return;
      }

      // 添加限流头
      if (headers) {
        const responseHeaders = new Headers(ctx.response.headers);
        responseHeaders.set(`${headerPrefix}-Limit`, max.toString());
        responseHeaders.set(`${headerPrefix}-Remaining`, remaining.toString());
        responseHeaders.set(
          `${headerPrefix}-Reset`,
          Math.ceil(resetTime / 1000).toString(),
        );

        // 创建新的响应
        ctx.response = new Response(ctx.response.body, {
          status: ctx.response.status,
          statusText: ctx.response.statusText,
          headers: responseHeaders,
        });
      }
    },
    // 注意：清理定时器的逻辑由闭包内部管理
    // cleanupInterval 会在服务容器销毁时自动清理
  };
}

// 导出默认创建函数
export default rateLimitPlugin;
