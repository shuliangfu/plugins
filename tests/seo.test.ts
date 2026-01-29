/**
 * SEO 优化插件测试
 *
 * 测试 SEO 插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { seoPlugin, type SEOPluginOptions } from "../src/seo/mod.ts";

describe("SEO 优化插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = seoPlugin();

      expect(plugin.name).toBe("@dreamer/plugins-seo");
      expect(plugin.version).toBe("0.1.0");
      expect(plugin.config?.seo).toBeDefined();
    });

    it("应该使用自定义配置创建插件", () => {
      const options: SEOPluginOptions = {
        title: "My Website",
        description: "A great website",
        keywords: ["web", "app", "deno"],
        siteUrl: "https://example.com",
        favicon: "/favicon.ico",
        openGraph: {
          siteName: "My Website",
          image: "https://example.com/og.png",
          imageWidth: 1200,
          imageHeight: 630,
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          username: "mywebsite",
          image: "https://example.com/twitter.png",
        },
        generateSitemap: true,
        sitemapPath: "./public/sitemap.xml",
        sitemapChangeFreq: "weekly",
        sitemapPriority: 0.8,
        generateRobots: true,
        robotsPath: "./public/robots.txt",
        robotsRules: [{ userAgent: "*", allow: ["/"], disallow: ["/admin"] }],
        structuredData: { "@type": "Organization", name: "My Company" },
      };

      const plugin = seoPlugin(options);
      const seoConfig = plugin.config?.seo as Record<string, unknown>;

      expect(seoConfig?.title).toBe("My Website");
      expect(seoConfig?.description).toBe("A great website");
      expect(seoConfig?.keywords).toEqual(["web", "app", "deno"]);
      expect((seoConfig?.openGraph as Record<string, unknown>)?.siteName).toBe(
        "My Website",
      );
      expect((seoConfig?.twitter as Record<string, unknown>)?.card).toBe(
        "summary_large_image",
      );
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = seoPlugin();

      expect(plugin.validateConfig?.({ seo: { keywords: ["test"] } })).toBe(
        true,
      );
    });

    it("应该拒绝无效的 keywords 配置", () => {
      const plugin = seoPlugin();

      expect(plugin.validateConfig?.({ seo: { keywords: "invalid" } })).toBe(
        false,
      );
    });

    it("应该拒绝无效的 robotsRules 配置", () => {
      const plugin = seoPlugin();

      expect(plugin.validateConfig?.({ seo: { robotsRules: "invalid" } })).toBe(
        false,
      );
    });

    it("应该接受空配置", () => {
      const plugin = seoPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 seoConfig 服务", () => {
      const plugin = seoPlugin({ title: "Test Site" });

      plugin.onInit?.(container);

      const config = container.get("seoConfig");
      expect(config).toBeDefined();
      expect((config as { title: string }).title).toBe("Test Site");
    });

    it("应该注册 seoService 服务", () => {
      const plugin = seoPlugin();

      plugin.onInit?.(container);

      const service = container.get("seoService");
      expect(service).toBeDefined();
    });

    it("seoService 应该提供 generateMetaTags 方法", () => {
      const plugin = seoPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generateMetaTags: () => Record<string, string>;
      }>("seoService");

      expect(service?.generateMetaTags).toBeDefined();
      expect(typeof service?.generateMetaTags).toBe("function");
    });

    it("seoService 应该提供 generateSitemap 方法", () => {
      const plugin = seoPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generateSitemap: (routes: string[]) => Promise<string>;
      }>("seoService");

      expect(service?.generateSitemap).toBeDefined();
      expect(typeof service?.generateSitemap).toBe("function");
    });

    it("seoService 应该提供 generateRobots 方法", () => {
      const plugin = seoPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        generateRobots: () => string;
      }>("seoService");

      expect(service?.generateRobots).toBeDefined();
      expect(typeof service?.generateRobots).toBe("function");
    });

    it("应该在有 logger 时输出日志", () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = seoPlugin({ generateSitemap: true, generateRobots: true });
      plugin.onInit?.(container);

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((m) => m.includes("SEO"))).toBe(true);
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = seoPlugin({ title: "Test" });
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

    it("应该注入 title 标签", async () => {
      const plugin = seoPlugin({ title: "My Page Title" });
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
      expect(body).toContain("<title>My Page Title</title>");
    });

    it("应该注入 description meta 标签", async () => {
      const plugin = seoPlugin({ description: "This is a test description" });
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
      expect(body).toContain('name="description"');
      expect(body).toContain("This is a test description");
    });

    it("应该注入 keywords meta 标签", async () => {
      const plugin = seoPlugin({ keywords: ["web", "app", "deno"] });
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
      expect(body).toContain('name="keywords"');
      expect(body).toContain("web, app, deno");
    });

    it("应该注入 canonical 链接", async () => {
      const plugin = seoPlugin({ siteUrl: "https://example.com" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/about"),
        path: "/about",
        method: "GET",
        url: new URL("http://localhost/about"),
        headers: new Headers(),
        response: new Response("<html><head></head><body></body></html>", {
          headers: { "Content-Type": "text/html" },
        }),
      };

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      expect(body).toContain('rel="canonical"');
      expect(body).toContain("https://example.com/about");
    });

    it("应该注入 favicon 链接", async () => {
      const plugin = seoPlugin({ favicon: "/favicon.ico" });
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
      expect(body).toContain('rel="icon"');
      expect(body).toContain("/favicon.ico");
    });

    it("应该注入 Open Graph 标签", async () => {
      const plugin = seoPlugin({
        title: "Test Page",
        description: "Test description",
        siteUrl: "https://example.com",
        openGraph: {
          siteName: "My Site",
          image: "https://example.com/og.png",
          imageWidth: 1200,
          imageHeight: 630,
          type: "article",
        },
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
      expect(body).toContain('property="og:site_name"');
      expect(body).toContain('property="og:title"');
      expect(body).toContain('property="og:description"');
      expect(body).toContain('property="og:image"');
      expect(body).toContain('property="og:type"');
      expect(body).toContain("article");
    });

    it("应该注入 Twitter Card 标签", async () => {
      const plugin = seoPlugin({
        title: "Test Page",
        description: "Test description",
        twitter: {
          card: "summary_large_image",
          username: "myhandle",
          image: "https://example.com/twitter.png",
        },
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
      expect(body).toContain('name="twitter:card"');
      expect(body).toContain("summary_large_image");
      expect(body).toContain('name="twitter:site"');
      expect(body).toContain("@myhandle");
      expect(body).toContain('name="twitter:image"');
    });

    it("应该注入结构化数据", async () => {
      const plugin = seoPlugin({
        structuredData: {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "My Company",
        },
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
      expect(body).toContain('type="application/ld+json"');
      expect(body).toContain("Organization");
      expect(body).toContain("My Company");
    });
  });

  describe("onBuildComplete 钩子", () => {
    it("应该在启用时生成 Sitemap", async () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = seoPlugin({ generateSitemap: true });
      plugin.onInit?.(container);

      await plugin.onBuildComplete?.({ outputFiles: [] }, container);

      expect(logMessages.some((m) => m.includes("Sitemap"))).toBe(true);
    });

    it("应该在启用时生成 Robots.txt", async () => {
      const logMessages: string[] = [];
      container.registerSingleton("logger", () => ({
        info: (msg: string) => logMessages.push(msg),
      }));

      const plugin = seoPlugin({ generateRobots: true });
      plugin.onInit?.(container);

      await plugin.onBuildComplete?.({ outputFiles: [] }, container);

      expect(logMessages.some((m) => m.includes("Robots"))).toBe(true);
    });
  });
});
