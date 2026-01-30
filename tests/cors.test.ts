/**
 * CORS 插件测试
 *
 * 测试 CORS 插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { corsPlugin, type CorsPluginOptions } from "../src/cors/mod.ts";

describe("CORS 插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = corsPlugin();
      const config = plugin.config?.cors as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-cors");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.origin).toBe("*");
      expect(config?.credentials).toBe(false);
      expect(config?.maxAge).toBe(86400);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: CorsPluginOptions = {
        origin: ["https://example.com", "https://app.example.com"],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "X-Custom-Header"],
        exposedHeaders: ["X-Response-Header"],
        credentials: true,
        maxAge: 3600,
      };

      const plugin = corsPlugin(options);
      const config = plugin.config?.cors as Record<string, unknown>;

      expect(config?.origin).toEqual([
        "https://example.com",
        "https://app.example.com",
      ]);
      expect(config?.methods).toEqual(["GET", "POST"]);
      expect(config?.credentials).toBe(true);
      expect(config?.maxAge).toBe(3600);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = corsPlugin();

      expect(
        plugin.validateConfig?.({ cors: { methods: ["GET", "POST"] } }),
      ).toBe(true);
    });

    it("应该拒绝无效的 methods 配置", () => {
      const plugin = corsPlugin();

      expect(plugin.validateConfig?.({ cors: { methods: "invalid" } })).toBe(
        false,
      );
    });

    it("应该拒绝无效的 maxAge 配置", () => {
      const plugin = corsPlugin();

      expect(plugin.validateConfig?.({ cors: { maxAge: -1 } })).toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = corsPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 corsConfig 服务", () => {
      const plugin = corsPlugin({ origin: "https://example.com" });

      plugin.onInit?.(container);

      const config = container.get("corsConfig");
      expect(config).toBeDefined();
      expect((config as { origin: string }).origin).toBe("https://example.com");
    });

    it("应该在有 logger 且开启 debug 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = corsPlugin({ debug: true });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("CORS"))).toBe(true);
    });
  });

  describe("onRequest 钩子（预检请求）", () => {
    it("应该处理 OPTIONS 预检请求", () => {
      const plugin = corsPlugin({ origin: "*" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api", { method: "OPTIONS" }),
        path: "/api",
        method: "OPTIONS",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx, container);

      expect(ctx.response).toBeDefined();
      expect(ctx.response?.status).toBe(204);
      expect(
        ctx.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBe("*");
      expect(
        ctx.response?.headers.get("Access-Control-Allow-Methods"),
      ).toBeDefined();
    });

    it("应该在预检请求中返回允许的头部", () => {
      const plugin = corsPlugin({
        allowedHeaders: ["Content-Type", "Authorization"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api", { method: "OPTIONS" }),
        path: "/api",
        method: "OPTIONS",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx, container);

      const allowedHeaders = ctx.response?.headers.get(
        "Access-Control-Allow-Headers",
      );
      expect(allowedHeaders).toContain("Content-Type");
      expect(allowedHeaders).toContain("Authorization");
    });

    it("应该在允许凭证时设置相应头", () => {
      const plugin = corsPlugin({
        origin: "https://example.com",
        credentials: true,
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api", { method: "OPTIONS" }),
        path: "/api",
        method: "OPTIONS",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx, container);

      expect(
        ctx.response?.headers.get("Access-Control-Allow-Credentials"),
      ).toBe("true");
    });

    it("应该设置预检缓存时间", () => {
      const plugin = corsPlugin({ maxAge: 7200 });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api", { method: "OPTIONS" }),
        path: "/api",
        method: "OPTIONS",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: undefined as Response | undefined,
      };

      plugin.onRequest?.(ctx, container);

      expect(ctx.response?.headers.get("Access-Control-Max-Age")).toBe("7200");
    });
  });

  describe("onResponse 钩子", () => {
    it("应该为允许的源添加 CORS 头", () => {
      const plugin = corsPlugin({ origin: "*" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: new Response('{"data": "test"}', {
          headers: { "Content-Type": "application/json" },
        }),
      };

      plugin.onResponse?.(ctx, container);

      expect(
        ctx.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBe("*");
    });

    it("应该为特定源返回该源而不是 *", () => {
      const plugin = corsPlugin({
        origin: ["https://example.com", "https://app.example.com"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx, container);

      expect(
        ctx.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBe("https://example.com");
    });

    it("应该不为不允许的源添加 CORS 头", () => {
      const plugin = corsPlugin({
        origin: "https://example.com",
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://evil.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx, container);

      expect(
        ctx.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBeNull();
    });

    it("应该使用函数判断源是否允许", () => {
      const plugin = corsPlugin({
        origin: (origin) => origin.endsWith(".example.com"),
      });
      plugin.onInit?.(container);

      // 允许的源
      const ctx1 = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://app.example.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx1, container);
      expect(
        ctx1.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBe("https://app.example.com");

      // 不允许的源
      const ctx2 = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://evil.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx2, container);
      expect(
        ctx2.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBeNull();
    });

    it("应该在允许凭证时设置相应头", () => {
      const plugin = corsPlugin({
        origin: "https://example.com",
        credentials: true,
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx, container);

      expect(
        ctx.response?.headers.get("Access-Control-Allow-Credentials"),
      ).toBe("true");
      // 允许凭证时应该返回具体源而不是 *
      expect(
        ctx.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBe("https://example.com");
    });

    it("应该暴露指定的响应头", () => {
      const plugin = corsPlugin({
        origin: "*",
        exposedHeaders: ["X-Custom-Header", "X-Another-Header"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx, container);

      const exposed = ctx.response?.headers.get(
        "Access-Control-Expose-Headers",
      );
      expect(exposed).toContain("X-Custom-Header");
      expect(exposed).toContain("X-Another-Header");
    });

    it("应该添加 Vary: Origin 头", () => {
      const plugin = corsPlugin({ origin: "*" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers({
          Origin: "https://example.com",
        }),
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx, container);

      const vary = ctx.response?.headers.get("Vary");
      expect(vary).toContain("Origin");
    });

    it("应该跳过没有 Origin 的请求", () => {
      const plugin = corsPlugin({ origin: "*" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api"),
        path: "/api",
        method: "GET",
        url: new URL("http://localhost/api"),
        headers: new Headers(), // 没有 Origin
        response: new Response('{"data": "test"}'),
      };

      plugin.onResponse?.(ctx, container);

      expect(
        ctx.response?.headers.get("Access-Control-Allow-Origin"),
      ).toBeNull();
    });
  });
});
