/**
 * Analytics 分析统计插件测试
 *
 * 测试 Analytics 插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { deleteEnv, getEnv, setEnv } from "@dreamer/runtime-adapter";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  analyticsPlugin,
  type AnalyticsPluginOptions,
} from "../src/analytics/mod.ts";

describe("Analytics 分析统计插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = analyticsPlugin();
      const analyticsConfig = plugin.config?.analytics as Record<
        string,
        unknown
      >;

      expect(plugin.name).toBe("@dreamer/plugins-analytics");
      expect(plugin.version).toBe("0.1.0");
      expect(plugin.config?.analytics).toBeDefined();
      expect(analyticsConfig?.trackPageviews).toBe(true);
      expect(analyticsConfig?.disableInDev).toBe(true);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: AnalyticsPluginOptions = {
        gaId: "UA-12345678-1",
        ga4Id: "G-XXXXXXXXXX",
        trackPageviews: true,
        trackEvents: true,
        trackPerformance: true,
        trackUserBehavior: true,
        customEvents: [
          { name: "button_click", category: "engagement", label: "cta" },
        ],
        debug: true,
        disableInDev: false,
        otherServices: [
          { name: "plausible", id: "example.com" },
          { name: "fathom", id: "ABCDEFG" },
        ],
      };

      const plugin = analyticsPlugin(options);
      const analyticsConfig = plugin.config?.analytics as Record<
        string,
        unknown
      >;

      expect(analyticsConfig?.gaId).toBe("UA-12345678-1");
      expect(analyticsConfig?.ga4Id).toBe("G-XXXXXXXXXX");
      expect(analyticsConfig?.trackPerformance).toBe(true);
      expect(analyticsConfig?.debug).toBe(true);
      expect((analyticsConfig?.otherServices as unknown[])?.length).toBe(2);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = analyticsPlugin();

      expect(plugin.validateConfig?.({ analytics: { customEvents: [] } })).toBe(
        true,
      );
    });

    it("应该拒绝无效的 customEvents 配置", () => {
      const plugin = analyticsPlugin();

      expect(
        plugin.validateConfig?.({ analytics: { customEvents: "invalid" } }),
      ).toBe(false);
    });

    it("应该拒绝无效的 otherServices 配置", () => {
      const plugin = analyticsPlugin();

      expect(
        plugin.validateConfig?.({ analytics: { otherServices: "invalid" } }),
      ).toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = analyticsPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 analyticsConfig 服务", () => {
      const plugin = analyticsPlugin({ ga4Id: "G-TEST123" });

      plugin.onInit?.(container);

      const config = container.get("analyticsConfig");
      expect(config).toBeDefined();
      expect((config as { ga4Id: string }).ga4Id).toBe("G-TEST123");
    });

    it("应该注册 analyticsService 服务", () => {
      const plugin = analyticsPlugin();

      plugin.onInit?.(container);

      const service = container.get("analyticsService");
      expect(service).toBeDefined();
    });

    it("analyticsService 应该提供 trackPageview 方法", () => {
      const plugin = analyticsPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        trackPageview: (path: string, title?: string) => void;
      }>("analyticsService");

      expect(service?.trackPageview).toBeDefined();
      expect(typeof service?.trackPageview).toBe("function");
    });

    it("analyticsService 应该提供 trackEvent 方法", () => {
      const plugin = analyticsPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        trackEvent: (
          name: string,
          category?: string,
          label?: string,
          value?: number,
        ) => void;
      }>("analyticsService");

      expect(service?.trackEvent).toBeDefined();
      expect(typeof service?.trackEvent).toBe("function");
    });

    it("analyticsService 应该提供 trackPerformance 方法", () => {
      const plugin = analyticsPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        trackPerformance: (metrics: Record<string, number>) => void;
      }>("analyticsService");

      expect(service?.trackPerformance).toBeDefined();
      expect(typeof service?.trackPerformance).toBe("function");
    });

    it("analyticsService 应该提供 trackUserBehavior 方法", () => {
      const plugin = analyticsPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        trackUserBehavior: (
          action: string,
          data?: Record<string, unknown>,
        ) => void;
      }>("analyticsService");

      expect(service?.trackUserBehavior).toBeDefined();
      expect(typeof service?.trackUserBehavior).toBe("function");
    });

    it("开启 debug 模式时应该输出日志", () => {
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => consoleLogs.push(args.join(" "));

      try {
        const plugin = analyticsPlugin({ debug: true });
        plugin.onInit?.(container);

        const service = container.get<{
          trackPageview: (path: string) => void;
          trackEvent: (name: string) => void;
        }>("analyticsService");

        service?.trackPageview("/test");
        service?.trackEvent("click");

        expect(consoleLogs.some((log) => log.includes("[Analytics]"))).toBe(
          true,
        );
      } finally {
        console.log = originalLog;
      }
    });

    it("应该在有 logger 时输出初始化日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = analyticsPlugin({ ga4Id: "G-TEST123" });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("Analytics"))).toBe(true);
      expect(logMessages.some((m) => m.includes("G-TEST123"))).toBe(true);
    });
  });

  describe("onRequest 钩子", () => {
    it("应该在开发环境且 disableInDev 时跳过", () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "dev");

      try {
        const plugin = analyticsPlugin({
          disableInDev: true,
          trackPerformance: true,
        });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
        };

        plugin.onRequest?.(ctx, container);

        // 不应该设置 analyticsStartTime
        expect((ctx as Record<string, unknown>).analyticsStartTime)
          .toBeUndefined();
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("应该在生产环境记录请求开始时间", () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({
          trackPerformance: true,
          disableInDev: true,
        });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
        };

        plugin.onRequest?.(ctx, container);

        expect((ctx as Record<string, unknown>).analyticsStartTime)
          .toBeDefined();
        expect(typeof (ctx as Record<string, unknown>).analyticsStartTime).toBe(
          "number",
        );
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("禁用性能追踪时不应该记录开始时间", () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({ trackPerformance: false });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
        };

        plugin.onRequest?.(ctx, container);

        expect((ctx as Record<string, unknown>).analyticsStartTime)
          .toBeUndefined();
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });
  });

  describe("onResponse 钩子", () => {
    it("应该在开发环境且 disableInDev 时跳过", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "dev");

      try {
        const plugin = analyticsPlugin({ disableInDev: true, ga4Id: "G-TEST" });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        // 不应该注入分析脚本
        expect(body).not.toContain("gtag");
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("应该跳过非 HTML 响应", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({ ga4Id: "G-TEST" });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/api"),
          path: "/api",
          method: "GET",
          url: new URL("http://localhost/api"),
          headers: new Headers(),
          response: new Response('{"data": "test"}', {
            headers: { "Content-Type": "application/json" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        expect(body).toBe('{"data": "test"}');
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("应该注入 Google Analytics 4 脚本", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({ ga4Id: "G-TESTID123" });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        expect(body).toContain("googletagmanager.com/gtag/js");
        expect(body).toContain("G-TESTID123");
        expect(body).toContain("gtag('config'");
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("应该注入 Universal Analytics 脚本", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({ gaId: "UA-12345678-1" });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        expect(body).toContain("google-analytics.com/analytics.js");
        expect(body).toContain("UA-12345678-1");
        expect(body).toContain("ga('send', 'pageview')");
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("应该注入 Plausible Analytics 脚本", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({
          otherServices: [{ name: "plausible", id: "example.com" }],
        });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        expect(body).toContain("plausible.io/js/script.js");
        expect(body).toContain('data-domain="example.com"');
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("应该同时注入多个分析服务脚本", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({
          ga4Id: "G-TEST123",
          gaId: "UA-12345678-1",
          otherServices: [{ name: "plausible", id: "example.com" }],
        });
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        expect(body).toContain("G-TEST123");
        expect(body).toContain("UA-12345678-1");
        expect(body).toContain("plausible.io");
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });

    it("没有配置分析服务时不应该注入脚本", async () => {
      const originalEnv = getEnv("DENO_ENV");
      setEnv("DENO_ENV", "production");

      try {
        const plugin = analyticsPlugin({});
        plugin.onInit?.(container);

        const ctx = {
          request: new Request("http://localhost/"),
          path: "/",
          method: "GET",
          url: new URL("http://localhost/"),
          headers: new Headers(),
          response: new Response("<html><head></head><body></body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
        };

        await plugin.onResponse?.(ctx, container);

        const body = await ctx.response?.text();
        // 响应应该保持不变
        expect(body).toBe("<html><head></head><body></body></html>");
      } finally {
        if (originalEnv) {
          setEnv("DENO_ENV", originalEnv);
        } else {
          deleteEnv("DENO_ENV");
        }
      }
    });
  });
});
