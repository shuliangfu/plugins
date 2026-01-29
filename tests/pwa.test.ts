/**
 * PWA 插件测试
 *
 * 测试 PWA 插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { pwaPlugin, type PWAPluginOptions } from "../src/pwa/mod.ts";

describe("PWA 插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = pwaPlugin();
      const pwaConfig = plugin.config?.pwa as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-pwa");
      expect(plugin.version).toBe("0.1.0");
      expect(plugin.config?.pwa).toBeDefined();
      expect(pwaConfig?.name).toBe("My App");
      expect(pwaConfig?.display).toBe("standalone");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: PWAPluginOptions = {
        name: "My Progressive Web App",
        shortName: "MyPWA",
        description: "An awesome PWA",
        themeColor: "#3498db",
        backgroundColor: "#ecf0f1",
        display: "fullscreen",
        startUrl: "/app",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        swPath: "/service-worker.js",
        swScope: "/app/",
        offlineSupport: true,
        cacheStrategy: "cacheFirst",
        pushNotifications: true,
        pushConfig: {
          publicKey: "test-key",
          serviceUrl: "https://push.example.com",
        },
        installPrompt: false,
      };

      const plugin = pwaPlugin(options);
      const pwaConfig = plugin.config?.pwa as Record<string, unknown>;

      expect(pwaConfig?.name).toBe("My Progressive Web App");
      expect(pwaConfig?.shortName).toBe("MyPWA");
      expect(pwaConfig?.display).toBe("fullscreen");
      expect((pwaConfig?.icons as unknown[])?.length).toBe(2);
      expect(pwaConfig?.cacheStrategy).toBe("cacheFirst");
      expect(pwaConfig?.pushNotifications).toBe(true);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = pwaPlugin();

      expect(plugin.validateConfig?.({ pwa: { icons: [] } })).toBe(true);
    });

    it("应该拒绝无效的 icons 配置", () => {
      const plugin = pwaPlugin();

      expect(plugin.validateConfig?.({ pwa: { icons: "invalid" } })).toBe(
        false,
      );
    });

    it("应该接受空配置", () => {
      const plugin = pwaPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 pwaConfig 服务", () => {
      const plugin = pwaPlugin({ name: "Test App" });

      plugin.onInit?.(container);

      const config = container.get("pwaConfig");
      expect(config).toBeDefined();
      expect((config as { name: string }).name).toBe("Test App");
    });

    it("应该注册 pwaService 服务", () => {
      const plugin = pwaPlugin();

      plugin.onInit?.(container);

      const service = container.get("pwaService");
      expect(service).toBeDefined();
    });

    it("pwaService 应该提供 generateManifest 方法", () => {
      const plugin = pwaPlugin({
        name: "Test App",
        shortName: "Test",
        themeColor: "#ff0000",
      });
      plugin.onInit?.(container);

      const service = container.get<{
        generateManifest: () => Record<string, unknown>;
      }>("pwaService");

      const manifest = service?.generateManifest();
      expect(manifest?.name).toBe("Test App");
      expect(manifest?.short_name).toBe("Test");
      expect(manifest?.theme_color).toBe("#ff0000");
    });

    it("应该在有 logger 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = pwaPlugin({
        offlineSupport: true,
        pushNotifications: true,
      });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("PWA"))).toBe(true);
    });

    it("应该输出 Service Worker 信息", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = pwaPlugin({ offlineSupport: true, swPath: "/sw.js" });
      plugin.onInit?.(container);

      expect(logMessages.some((m) => m.includes("Service Worker"))).toBe(true);
    });

    it("应该输出推送通知信息", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = pwaPlugin({ pushNotifications: true });
      plugin.onInit?.(container);

      expect(logMessages.some((m) => m.includes("推送通知"))).toBe(true);
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = pwaPlugin();
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
    });

    it("应该注入 manifest 链接", async () => {
      const plugin = pwaPlugin();
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
      expect(body).toContain('rel="manifest"');
      expect(body).toContain("/manifest.json");
    });

    it("应该注入 theme-color meta 标签", async () => {
      const plugin = pwaPlugin({ themeColor: "#3498db" });
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
      expect(body).toContain('name="theme-color"');
      expect(body).toContain("#3498db");
    });

    it("应该注入移动端 meta 标签", async () => {
      const plugin = pwaPlugin({ name: "Test App" });
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
      expect(body).toContain('name="mobile-web-app-capable"');
      expect(body).toContain('name="apple-mobile-web-app-capable"');
      expect(body).toContain('name="apple-mobile-web-app-title"');
      expect(body).toContain("Test App");
    });

    it("应该注入 Apple Touch Icon", async () => {
      const plugin = pwaPlugin({
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
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
      expect(body).toContain('rel="apple-touch-icon"');
      expect(body).toContain("/icons/icon-192.png");
    });

    it("应该注入 Service Worker 注册脚本", async () => {
      const plugin = pwaPlugin({
        offlineSupport: true,
        swPath: "/sw.js",
        swScope: "/",
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
      expect(body).toContain("serviceWorker");
      expect(body).toContain("/sw.js");
      expect(body).toContain("register");
    });

    it("禁用离线支持时不应该注入 Service Worker 脚本", async () => {
      const plugin = pwaPlugin({ offlineSupport: false });
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
      expect(body).not.toContain("serviceWorker.register");
    });
  });
});
