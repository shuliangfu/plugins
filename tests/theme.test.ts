/**
 * 主题插件测试
 *
 * 测试主题插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import { themePlugin, type ThemePluginOptions } from "../src/theme/mod.ts";

describe("主题插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  // 每个测试后清理
  afterEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = themePlugin();
      const config = plugin.config?.theme as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-theme");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.defaultMode).toBe("system");
      expect(config?.strategy).toBe("class");
      expect(config?.darkClass).toBe("dark");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: ThemePluginOptions = {
        defaultMode: "dark",
        strategy: "attribute",
        attribute: "data-mode",
        cookieName: "app-theme",
      };

      const plugin = themePlugin(options);
      const config = plugin.config?.theme as Record<string, unknown>;

      expect(config?.defaultMode).toBe("dark");
      expect(config?.strategy).toBe("attribute");
      expect(config?.attribute).toBe("data-mode");
      expect(config?.cookieName).toBe("app-theme");
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = themePlugin();

      expect(plugin.validateConfig?.({ theme: { defaultMode: "dark" } })).toBe(true);
      expect(plugin.validateConfig?.({ theme: { defaultMode: "light" } })).toBe(true);
      expect(plugin.validateConfig?.({ theme: { defaultMode: "system" } })).toBe(true);
    });

    it("应该拒绝无效的 defaultMode", () => {
      const plugin = themePlugin();

      expect(plugin.validateConfig?.({ theme: { defaultMode: "invalid" } })).toBe(false);
    });

    it("应该拒绝无效的 strategy", () => {
      const plugin = themePlugin();

      expect(plugin.validateConfig?.({ theme: { strategy: "invalid" } })).toBe(false);
    });

    it("应该拒绝无效的 transitionDuration", () => {
      const plugin = themePlugin();

      expect(plugin.validateConfig?.({ theme: { transitionDuration: -1 } })).toBe(false);
      expect(plugin.validateConfig?.({ theme: { transitionDuration: "fast" } })).toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = themePlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 themeConfig 服务", async () => {
      const plugin = themePlugin({ defaultMode: "dark" });

      await plugin.onInit?.(container);

      const config = container.get("themeConfig");
      expect(config).toBeDefined();
      expect((config as { defaultMode: string }).defaultMode).toBe("dark");
    });

    it("应该注册 themeService 服务", async () => {
      const plugin = themePlugin();

      await plugin.onInit?.(container);

      const service = container.get("themeService");
      expect(service).toBeDefined();
    });

    it("themeService 应该提供 getCurrentTheme 方法", async () => {
      const plugin = themePlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        getCurrentTheme: () => string;
      }>("themeService");

      expect(service?.getCurrentTheme).toBeDefined();
      expect(typeof service?.getCurrentTheme()).toBe("string");
    });

    it("themeService 应该提供 getCurrentMode 方法", async () => {
      const plugin = themePlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        getCurrentMode: () => string;
      }>("themeService");

      expect(service?.getCurrentMode).toBeDefined();
    });

    it("themeService 应该提供 setTheme 方法", async () => {
      const plugin = themePlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        setTheme: (theme: "light" | "dark") => void;
        getCurrentTheme: () => string;
      }>("themeService");

      service?.setTheme("dark");
      expect(service?.getCurrentTheme()).toBe("dark");

      service?.setTheme("light");
      expect(service?.getCurrentTheme()).toBe("light");
    });

    it("themeService 应该提供 setMode 方法", async () => {
      const plugin = themePlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        setMode: (mode: "light" | "dark" | "system") => void;
        getCurrentMode: () => string;
      }>("themeService");

      service?.setMode("dark");
      expect(service?.getCurrentMode()).toBe("dark");

      service?.setMode("system");
      expect(service?.getCurrentMode()).toBe("system");
    });
  });

  describe("onRequest 钩子", () => {
    it("应该从 Cookie 读取主题", async () => {
      const plugin = themePlugin({ cookieName: "theme" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: {
          get: (name: string) => (name === "theme" ? "dark" : undefined),
        },
      };

      await plugin.onRequest?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onRequest>>[0], container);

      expect((ctx as unknown as { theme: string }).theme).toBe("dark");
      expect((ctx as unknown as { themeMode: string }).themeMode).toBe("dark");
    });

    it("应该处理 system 模式", async () => {
      const plugin = themePlugin({ cookieName: "theme" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: {
          get: (name: string) => (name === "theme" ? "system" : undefined),
        },
      };

      await plugin.onRequest?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onRequest>>[0], container);

      expect((ctx as unknown as { themeMode: string }).themeMode).toBe("system");
      // 服务端 system 模式默认为 light
      expect((ctx as unknown as { theme: string }).theme).toBe("light");
    });

    it("无 Cookie 时应该使用默认模式", async () => {
      const plugin = themePlugin({ defaultMode: "dark" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: {
          get: () => undefined,
        },
      };

      await plugin.onRequest?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onRequest>>[0], container);

      expect((ctx as unknown as { themeMode: string }).themeMode).toBe("dark");
      expect((ctx as unknown as { theme: string }).theme).toBe("dark");
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = themePlugin();
      await plugin.onInit?.(container);

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

      await plugin.onResponse?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onResponse>>[0], container);

      const body = await ctx.response?.text();
      expect(body).toBe('{"data": "test"}');
    });

    it("应该注入防闪烁脚本", async () => {
      const plugin = themePlugin({ injectScript: true });
      await plugin.onInit?.(container);

      const html = `<html><head></head><body>Test</body></html>`;
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: new Response(html, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onResponse>>[0], container);

      const body = await ctx.response?.text();
      expect(body).toContain("<script>");
      expect(body).toContain("$theme");
    });

    it("应该为 class 策略添加 dark class", async () => {
      const plugin = themePlugin({ strategy: "class", darkClass: "dark" });
      await plugin.onInit?.(container);

      // 模拟请求设置为 dark
      const reqCtx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: { get: () => "dark" },
      };
      await plugin.onRequest?.(reqCtx as unknown as Parameters<NonNullable<typeof plugin.onRequest>>[0], container);

      const html = `<html><head></head><body>Test</body></html>`;
      const resCtx = {
        ...reqCtx,
        response: new Response(html, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(resCtx as unknown as Parameters<NonNullable<typeof plugin.onResponse>>[0], container);

      const body = await resCtx.response?.text();
      expect(body).toContain('class="dark"');
    });

    it("应该为 attribute 策略添加属性", async () => {
      const plugin = themePlugin({ strategy: "attribute", attribute: "data-theme" });
      await plugin.onInit?.(container);

      // 模拟请求设置为 dark
      const reqCtx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: { get: () => "dark" },
      };
      await plugin.onRequest?.(reqCtx as unknown as Parameters<NonNullable<typeof plugin.onRequest>>[0], container);

      const html = `<html><head></head><body>Test</body></html>`;
      const resCtx = {
        ...reqCtx,
        response: new Response(html, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(resCtx as unknown as Parameters<NonNullable<typeof plugin.onResponse>>[0], container);

      const body = await resCtx.response?.text();
      expect(body).toContain('data-theme="dark"');
    });

    it("禁用脚本注入时不应该注入脚本", async () => {
      const plugin = themePlugin({ injectScript: false });
      await plugin.onInit?.(container);

      const html = `<html><head></head><body>Test</body></html>`;
      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        cookies: { get: () => undefined },
        response: new Response(html, {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onRequest?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onRequest>>[0], container);
      await plugin.onResponse?.(ctx as unknown as Parameters<NonNullable<typeof plugin.onResponse>>[0], container);

      const body = await ctx.response?.text();
      expect(body).not.toContain("$theme");
    });
  });

  describe("配置选项", () => {
    it("应该支持自定义 cookieName", () => {
      const plugin = themePlugin({ cookieName: "app-theme" });
      const config = plugin.config?.theme as Record<string, unknown>;

      expect(config?.cookieName).toBe("app-theme");
    });

    it("应该支持自定义 cookieExpireDays", () => {
      const plugin = themePlugin({ cookieExpireDays: 30 });
      const config = plugin.config?.theme as Record<string, unknown>;

      expect(config?.cookieExpireDays).toBe(30);
    });

    it("应该支持自定义 transitionDuration", () => {
      const plugin = themePlugin({ transitionDuration: 500 });
      const config = plugin.config?.theme as Record<string, unknown>;

      expect(config?.transitionDuration).toBe(500);
    });
  });
});
