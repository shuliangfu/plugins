/**
 * 静态文件插件测试
 *
 * 测试静态文件插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  staticPlugin,
  type StaticPluginOptions,
} from "../src/static/mod.ts";

describe("静态文件插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = staticPlugin();
      const config = plugin.config?.static as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-static");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.root).toBe("./public");
      expect(config?.prefix).toBe("/");
      expect(config?.etag).toBe(true);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: StaticPluginOptions = {
        root: "./assets",
        prefix: "/static",
        index: ["index.html", "index.htm"],
        directoryListing: true,
        cacheControl: "public, max-age=3600",
        etag: false,
      };

      const plugin = staticPlugin(options);
      const config = plugin.config?.static as Record<string, unknown>;

      expect(config?.root).toBe("./assets");
      expect(config?.prefix).toBe("/static");
      expect(config?.directoryListing).toBe(true);
      expect(config?.etag).toBe(false);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = staticPlugin();

      expect(plugin.validateConfig?.({ static: { root: "./public" } })).toBe(
        true,
      );
    });

    it("应该拒绝无效的 index 配置", () => {
      const plugin = staticPlugin();

      expect(plugin.validateConfig?.({ static: { index: "invalid" } })).toBe(
        false,
      );
    });

    it("应该接受空配置", () => {
      const plugin = staticPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 staticConfig 服务", () => {
      const plugin = staticPlugin({ root: "./assets" });

      plugin.onInit?.(container);

      const config = container.get("staticConfig");
      expect(config).toBeDefined();
      expect((config as { root: string }).root).toBe("./assets");
    });

    it("应该注册 staticService 服务", () => {
      const plugin = staticPlugin();

      plugin.onInit?.(container);

      const service = container.get("staticService");
      expect(service).toBeDefined();
    });

    it("staticService 应该提供 getMimeType 方法", () => {
      const plugin = staticPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        getMimeType: (path: string) => string;
      }>("staticService");

      expect(service?.getMimeType).toBeDefined();
      expect(service?.getMimeType("test.html")).toBe("text/html; charset=utf-8");
      expect(service?.getMimeType("test.css")).toBe("text/css; charset=utf-8");
      expect(service?.getMimeType("test.js")).toBe(
        "text/javascript; charset=utf-8",
      );
      expect(service?.getMimeType("test.png")).toBe("image/png");
      expect(service?.getMimeType("test.unknown")).toBe(
        "application/octet-stream",
      );
    });

    it("staticService 应该提供 computeEtag 方法", () => {
      const plugin = staticPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        computeEtag: (content: Uint8Array, mtime: number) => string;
      }>("staticService");

      expect(service?.computeEtag).toBeDefined();

      const content = new TextEncoder().encode("Hello World");
      const etag = service?.computeEtag(content, 1234567890);
      expect(etag).toBeDefined();
      expect(etag).toMatch(/^".+"$/);
    });
  });

  describe("onRequest 钩子", () => {
    it("应该跳过不匹配前缀的请求", async () => {
      const plugin = staticPlugin({ prefix: "/static" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 不匹配前缀，不应该处理
      expect(ctx.response).toBeUndefined();
    });

    it("应该拒绝目录遍历攻击", async () => {
      const plugin = staticPlugin({ root: "./public" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/../../../etc/passwd"),
        path: "/../../../etc/passwd",
        method: "GET",
        url: new URL("http://localhost/../../../etc/passwd"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 目录遍历攻击应该返回 403
      expect(ctx.response?.status).toBe(403);
    });

    it("应该拒绝隐藏文件访问（默认）", async () => {
      const plugin = staticPlugin({ root: "./public" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/.env"),
        path: "/.env",
        method: "GET",
        url: new URL("http://localhost/.env"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 隐藏文件应该返回 403
      expect(ctx.response?.status).toBe(403);
    });

    it("应该只处理 GET 和 HEAD 请求", async () => {
      const plugin = staticPlugin();
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/test.html", { method: "POST" }),
        path: "/test.html",
        method: "POST",
        url: new URL("http://localhost/test.html"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // POST 请求不应该处理
      expect(ctx.response).toBeUndefined();
    });
  });

  describe("MIME 类型检测", () => {
    it("应该正确检测常见 MIME 类型", () => {
      const plugin = staticPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        getMimeType: (path: string) => string;
      }>("staticService");

      expect(service?.getMimeType("test.html")).toBe("text/html; charset=utf-8");
      expect(service?.getMimeType("test.json")).toBe(
        "application/json; charset=utf-8",
      );
      expect(service?.getMimeType("test.jpg")).toBe("image/jpeg");
      expect(service?.getMimeType("test.jpeg")).toBe("image/jpeg");
      expect(service?.getMimeType("test.gif")).toBe("image/gif");
      expect(service?.getMimeType("test.svg")).toBe("image/svg+xml");
      expect(service?.getMimeType("test.woff2")).toBe("font/woff2");
      expect(service?.getMimeType("test.mp4")).toBe("video/mp4");
      expect(service?.getMimeType("test.pdf")).toBe("application/pdf");
    });

    it("应该支持自定义 MIME 类型", () => {
      const plugin = staticPlugin({
        mimeTypes: {
          ".custom": "application/x-custom",
        },
      });
      plugin.onInit?.(container);

      const service = container.get<{
        getMimeType: (path: string) => string;
      }>("staticService");

      expect(service?.getMimeType("test.custom")).toBe("application/x-custom");
    });
  });

  describe("ETag 支持", () => {
    it("应该生成一致的 ETag", () => {
      const plugin = staticPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        computeEtag: (content: Uint8Array, mtime: number) => string;
      }>("staticService");

      const content = new TextEncoder().encode("Hello World");
      const mtime = 1234567890;

      const etag1 = service?.computeEtag(content, mtime);
      const etag2 = service?.computeEtag(content, mtime);

      // 相同内容和时间应该生成相同的 ETag
      expect(etag1).toBe(etag2);
    });

    it("不同内容应该生成不同的 ETag", () => {
      const plugin = staticPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        computeEtag: (content: Uint8Array, mtime: number) => string;
      }>("staticService");

      const content1 = new TextEncoder().encode("Hello World");
      const content2 = new TextEncoder().encode("Hello Universe");
      const mtime = 1234567890;

      const etag1 = service?.computeEtag(content1, mtime);
      const etag2 = service?.computeEtag(content2, mtime);

      expect(etag1).not.toBe(etag2);
    });
  });
});
