/**
 * 图片处理插件测试
 *
 * 测试图片处理插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import { imagePlugin, type ImagePluginOptions } from "../src/image/mod.ts";

describe("图片处理插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = imagePlugin();
      const config = plugin.config?.image as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-image");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.routePrefix).toBe("/_image");
      expect(config?.quality).toBe(80);
      expect(config?.format).toBe("webp");
    });

    it("应该使用自定义配置创建插件", () => {
      const options: ImagePluginOptions = {
        routePrefix: "/images",
        sourceDir: "./assets/images",
        cacheDir: "./.cache/img",
        quality: 90,
        format: "avif",
        sizes: [
          { width: 320, suffix: "sm" },
          { width: 640, suffix: "md" },
          { width: 1024, suffix: "lg" },
        ],
      };

      const plugin = imagePlugin(options);
      const config = plugin.config?.image as Record<string, unknown>;

      expect(config?.routePrefix).toBe("/images");
      expect(config?.quality).toBe(90);
      expect(config?.format).toBe("avif");
      expect((config?.sizes as unknown[])?.length).toBe(3);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = imagePlugin();

      expect(plugin.validateConfig?.({ image: { quality: 85 } })).toBe(true);
    });

    it("应该拒绝无效的 quality 配置", () => {
      const plugin = imagePlugin();

      expect(plugin.validateConfig?.({ image: { quality: 0 } })).toBe(false);
      expect(plugin.validateConfig?.({ image: { quality: 101 } })).toBe(false);
    });

    it("应该接受空配置", () => {
      const plugin = imagePlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 imageConfig 服务", async () => {
      const plugin = imagePlugin({ quality: 95 });

      await plugin.onInit?.(container);

      const config = container.get("imageConfig");
      expect(config).toBeDefined();
      expect((config as { quality: number }).quality).toBe(95);
    });

    it("应该注册 imageService 服务", async () => {
      const plugin = imagePlugin();

      await plugin.onInit?.(container);

      const service = container.get("imageService");
      expect(service).toBeDefined();
    });

    it("imageService 应该提供 getUrl 方法", async () => {
      const plugin = imagePlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        getUrl: (
          src: string,
          params?: Record<string, unknown>,
        ) => string;
      }>("imageService");

      expect(service?.getUrl).toBeDefined();
      expect(typeof service?.getUrl).toBe("function");
    });

    it("imageService 应该提供 getSrcSet 方法", async () => {
      const plugin = imagePlugin({
        sizes: [
          { width: 320, suffix: "sm" },
          { width: 640, suffix: "md" },
        ],
      });
      await plugin.onInit?.(container);

      const service = container.get<{
        getSrcSet: (src: string) => string;
      }>("imageService");

      expect(service?.getSrcSet).toBeDefined();

      const srcSet = service?.getSrcSet("/images/test.jpg");
      expect(srcSet).toContain("320w");
      expect(srcSet).toContain("640w");
    });

    it("imageService 应该提供 getLazyHtml 方法", async () => {
      const plugin = imagePlugin({ lazyLoad: true });
      await plugin.onInit?.(container);

      const service = container.get<{
        getLazyHtml: (
          src: string,
          alt: string,
          params?: Record<string, unknown>,
        ) => string;
      }>("imageService");

      expect(service?.getLazyHtml).toBeDefined();

      // getLazyHtml 返回的是带 data-src 和 class="lazy" 的 HTML，用于 IntersectionObserver 懒加载
      const html = service?.getLazyHtml("/images/test.jpg", "Test");
      expect(html).toContain("data-src=");
      expect(html).toContain("alt=\"Test\"");
      expect(html).toContain("class=\"lazy\"");
    });
  });

  describe("imageService", () => {
    it("应该生成正确的 srcset", async () => {
      const plugin = imagePlugin({
        routePrefix: "/_image",
        sizes: [
          { width: 320, suffix: "sm" },
          { width: 640, suffix: "md" },
          { width: 1024, suffix: "lg" },
        ],
      });
      await plugin.onInit?.(container);

      const service = container.get<{
        getSrcSet: (src: string) => string;
      }>("imageService");

      const srcSet = service?.getSrcSet("/photos/hero.jpg");

      expect(srcSet).toContain("320w");
      expect(srcSet).toContain("640w");
      expect(srcSet).toContain("1024w");
    });

    it("应该生成懒加载 HTML", async () => {
      const plugin = imagePlugin({
        lazyLoad: true,
        placeholderColor: "#f0f0f0",
      });
      await plugin.onInit?.(container);

      const service = container.get<{
        getLazyHtml: (
          src: string,
          alt: string,
          params?: Record<string, unknown>,
        ) => string;
      }>("imageService");

      const html = service?.getLazyHtml(
        "/images/photo.jpg",
        "A beautiful photo",
      );

      expect(html).toContain("<img");
      // getLazyHtml 使用 data-src 和 class="lazy" 方式实现懒加载
      expect(html).toContain("data-src=");
      expect(html).toContain("alt=\"A beautiful photo\"");
      expect(html).toContain("class=\"lazy\"");
    });
  });

  describe("onRequest 钩子", () => {
    it("应该跳过非图片路径", async () => {
      const plugin = imagePlugin({ routePrefix: "/_image" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 不匹配路径，不应该处理
      expect(ctx.response).toBeUndefined();
    });

    it("应该只处理 GET 请求", async () => {
      const plugin = imagePlugin({ routePrefix: "/_image" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/_image/photo.jpg", {
          method: "POST",
        }),
        path: "/_image/photo.jpg",
        method: "POST",
        url: new URL("http://localhost/_image/photo.jpg"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // POST 请求不应该处理
      expect(ctx.response).toBeUndefined();
    });
  });

  describe("onResponse 钩子", () => {
    it("应该跳过非 HTML 响应", async () => {
      const plugin = imagePlugin({ lazyLoad: true });
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

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      expect(body).toBe('{"data": "test"}');
    });

    it("应该为 HTML 响应注入懒加载脚本", async () => {
      const plugin = imagePlugin({ lazyLoad: true });
      await plugin.onInit?.(container);

      const html = `<html><body><img src="/images/photo.jpg" alt="Photo"></body></html>`;
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

      await plugin.onResponse?.(ctx, container);

      const body = await ctx.response?.text();
      // onResponse 会注入懒加载脚本，用于处理带有 class="lazy" 和 data-src 的图片
      expect(body).toContain("<script>");
      expect(body).toContain("IntersectionObserver");
      expect(body).toContain("img.lazy");
    });
  });
});
