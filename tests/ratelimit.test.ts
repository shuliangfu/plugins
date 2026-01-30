/**
 * 速率限制插件测试
 *
 * 测试速率限制插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  rateLimitPlugin,
  type RateLimitPluginOptions,
} from "../src/ratelimit/mod.ts";

describe("速率限制插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = rateLimitPlugin();
      const config = plugin.config?.rateLimit as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-ratelimit");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.max).toBe(100);
      expect(config?.windowMs).toBe(60000);
      expect(config?.statusCode).toBe(429);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: RateLimitPluginOptions = {
        max: 50,
        windowMs: 30000,
        statusCode: 503,
        message: "服务繁忙",
        headers: true,
        headerPrefix: "X-Rate",
      };

      const plugin = rateLimitPlugin(options);
      const config = plugin.config?.rateLimit as Record<string, unknown>;

      expect(config?.max).toBe(50);
      expect(config?.windowMs).toBe(30000);
      expect(config?.statusCode).toBe(503);
      expect(config?.message).toBe("服务繁忙");
      expect(config?.headerPrefix).toBe("X-Rate");
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = rateLimitPlugin();

      expect(plugin.validateConfig?.({ rateLimit: { max: 50 } })).toBe(true);
    });

    it("应该拒绝无效的 max 配置", () => {
      const plugin = rateLimitPlugin();

      expect(plugin.validateConfig?.({ rateLimit: { max: 0 } })).toBe(false);
      expect(plugin.validateConfig?.({ rateLimit: { max: -1 } })).toBe(false);
    });

    it("应该拒绝无效的 windowMs 配置", () => {
      const plugin = rateLimitPlugin();

      expect(plugin.validateConfig?.({ rateLimit: { windowMs: 0 } })).toBe(
        false,
      );
    });

    it("应该接受空配置", () => {
      const plugin = rateLimitPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 rateLimitConfig 服务", () => {
      const plugin = rateLimitPlugin({ max: 200 });

      plugin.onInit?.(container);

      const config = container.get("rateLimitConfig");
      expect(config).toBeDefined();
      expect((config as { max: number }).max).toBe(200);
    });

    it("应该注册 rateLimitService 服务", () => {
      const plugin = rateLimitPlugin();

      plugin.onInit?.(container);

      const service = container.get("rateLimitService");
      expect(service).toBeDefined();
    });

    it("rateLimitService 应该提供正确的方法", () => {
      const plugin = rateLimitPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        isLimited: (key: string) => boolean;
        getRemaining: (key: string) => number;
        getResetTime: (key: string) => number;
      }>("rateLimitService");

      expect(service?.isLimited).toBeDefined();
      expect(service?.getRemaining).toBeDefined();
      expect(service?.getResetTime).toBeDefined();
    });

    it("应该在有 logger 且开启 debug 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = rateLimitPlugin({ debug: true });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("速率限制"))).toBe(true);
    });
  });

  describe("rateLimitService", () => {
    it("应该正确检查是否超出限制", () => {
      const plugin = rateLimitPlugin({ max: 3 });
      plugin.onInit?.(container);

      const service = container.get<{
        isLimited: (key: string) => boolean;
        getRemaining: (key: string) => number;
      }>("rateLimitService");

      // 初始状态不应该被限制
      expect(service?.isLimited("test-key")).toBe(false);
      expect(service?.getRemaining("test-key")).toBe(3);
    });

    it("应该返回正确的重置时间", () => {
      const plugin = rateLimitPlugin({ windowMs: 60000 });
      plugin.onInit?.(container);

      const service = container.get<{
        getResetTime: (key: string) => number;
      }>("rateLimitService");

      const resetTime = service?.getResetTime("test-key");
      const now = Date.now();

      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThanOrEqual(now + 60000);
    });
  });

  describe("onRequest 钩子", () => {
    it("应该允许在限制内的请求", () => {
      const plugin = rateLimitPlugin({ max: 10 });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.1",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx, container);

      // 应该没有设置响应（继续处理）
      expect(ctx.response).toBeUndefined();
    });

    it("应该阻止超出限制的请求", () => {
      const plugin = rateLimitPlugin({ max: 2 });
      plugin.onInit?.(container);

      const makeRequest = () => ({
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.2",
        }),
        response: undefined as Response | undefined,
      });

      // 发送 3 次请求
      const ctx1 = makeRequest();
      plugin.onRequest?.(ctx1, container);
      expect(ctx1.response).toBeUndefined();

      const ctx2 = makeRequest();
      plugin.onRequest?.(ctx2, container);
      expect(ctx2.response).toBeUndefined();

      const ctx3 = makeRequest();
      plugin.onRequest?.(ctx3, container);
      expect(ctx3.response).toBeDefined();
      expect(ctx3.response?.status).toBe(429);
    });

    it("应该返回正确的限流响应", async () => {
      const plugin = rateLimitPlugin({
        max: 1,
        message: "请求过于频繁",
      });
      plugin.onInit?.(container);

      const makeRequest = () => ({
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.3",
        }),
        response: undefined as Response | undefined,
      });

      // 第一次请求
      const ctx1 = makeRequest();
      plugin.onRequest?.(ctx1, container);

      // 第二次请求应该被限制
      const ctx2 = makeRequest();
      plugin.onRequest?.(ctx2, container);

      expect(ctx2.response?.status).toBe(429);
      expect(ctx2.response?.headers.get("Content-Type")).toBe(
        "application/json",
      );

      const body = await ctx2.response?.json();
      expect(body.error).toBe("请求过于频繁");
    });

    it("应该在限流响应中包含正确的头部", () => {
      const plugin = rateLimitPlugin({ max: 1, headerPrefix: "X-RateLimit" });
      plugin.onInit?.(container);

      const makeRequest = () => ({
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.4",
        }),
        response: undefined as Response | undefined,
      });

      const ctx1 = makeRequest();
      plugin.onRequest?.(ctx1, container);

      const ctx2 = makeRequest();
      plugin.onRequest?.(ctx2, container);

      expect(ctx2.response?.headers.get("X-RateLimit-Limit")).toBe("1");
      expect(ctx2.response?.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(ctx2.response?.headers.get("X-RateLimit-Reset")).toBeDefined();
      expect(ctx2.response?.headers.get("Retry-After")).toBeDefined();
    });

    it("应该跳过字符串配置的路径", () => {
      const plugin = rateLimitPlugin({
        max: 1,
        skip: ["/health", "/public"],
      });
      plugin.onInit?.(container);

      // 跳过的路径
      const ctx1 = {
        request: new Request("http://localhost/health"),
        path: "/health",
        method: "GET",
        url: new URL("http://localhost/health"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.5",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx1, container);
      plugin.onRequest?.(ctx1, container);
      plugin.onRequest?.(ctx1, container);

      // 即使多次请求也不应该被限制
      expect(ctx1.response).toBeUndefined();
    });

    it("应该跳过正则配置的路径", () => {
      const plugin = rateLimitPlugin({
        max: 1,
        skip: [/^\/public\//],
      });
      plugin.onInit?.(container);

      // 正则匹配的路径
      const ctx2 = {
        request: new Request("http://localhost/public/assets/style.css"),
        path: "/public/assets/style.css",
        method: "GET",
        url: new URL("http://localhost/public/assets/style.css"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.5",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx2, container);
      plugin.onRequest?.(ctx2, container);

      expect(ctx2.response).toBeUndefined();
    });

    it("应该使用自定义的标识符生成器", () => {
      const plugin = rateLimitPlugin({
        max: 1,
        keyGenerator: (ctx) => {
          // 使用 API Key 作为标识符
          return ctx.headers?.get("X-API-Key") || "anonymous";
        },
      });
      plugin.onInit?.(container);

      // 不同的 API Key 应该有独立的限制
      const ctx1 = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-API-Key": "key-1",
        }),
        response: undefined as Response | undefined,
      };

      const ctx2 = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-API-Key": "key-2",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx1, container);
      plugin.onRequest?.(ctx2, container);

      // 两个不同的 key 都应该通过
      expect(ctx1.response).toBeUndefined();
      expect(ctx2.response).toBeUndefined();

      // 再次使用 key-1
      const ctx3 = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-API-Key": "key-1",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx3, container);

      // key-1 应该被限制
      expect(ctx3.response?.status).toBe(429);
    });
  });

  describe("onResponse 钩子", () => {
    it("应该在响应中添加限流头", () => {
      const plugin = rateLimitPlugin({ max: 100 });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.6",
        }),
        response: undefined as Response | undefined,
        _rateLimitKey: undefined as string | undefined,
        _rateLimitCount: undefined as number | undefined,
      };

      // 先调用 onRequest
      plugin.onRequest?.(ctx, container);

      // 设置响应
      ctx.response = new Response('{"data": "test"}', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      // 调用 onResponse
      plugin.onResponse?.(ctx, container);

      expect(ctx.response?.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(ctx.response?.headers.get("X-RateLimit-Remaining")).toBe("99");
    });

    it("应该在 skipSuccessfulRequests 时减少计数", () => {
      const plugin = rateLimitPlugin({
        max: 2,
        skipSuccessfulRequests: true,
      });
      plugin.onInit?.(container);

      const makeRequest = () => ({
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.7",
        }),
        response: undefined as Response | undefined,
        _rateLimitKey: undefined as string | undefined,
        _rateLimitCount: undefined as number | undefined,
      });

      // 发送多次成功请求
      for (let i = 0; i < 5; i++) {
        const ctx = makeRequest();
        plugin.onRequest?.(ctx, container);

        // 设置成功响应
        ctx.response = new Response('{"data": "test"}', { status: 200 });
        plugin.onResponse?.(ctx, container);
      }

      // 因为成功请求被跳过，不应该被限制
      const ctx = makeRequest();
      plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeUndefined();
    });

    it("应该在 skipFailedRequests 时减少计数", () => {
      const plugin = rateLimitPlugin({
        max: 2,
        skipFailedRequests: true,
      });
      plugin.onInit?.(container);

      const makeRequest = () => ({
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          "X-Forwarded-For": "192.168.1.8",
        }),
        response: undefined as Response | undefined,
        _rateLimitKey: undefined as string | undefined,
        _rateLimitCount: undefined as number | undefined,
      });

      // 发送多次失败请求
      for (let i = 0; i < 5; i++) {
        const ctx = makeRequest();
        plugin.onRequest?.(ctx, container);

        // 设置失败响应
        ctx.response = new Response('{"error": "test"}', { status: 500 });
        plugin.onResponse?.(ctx, container);
      }

      // 因为失败请求被跳过，不应该被限制
      const ctx = makeRequest();
      plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeUndefined();
    });
  });
}, { sanitizeOps: false , sanitizeResources: false });
