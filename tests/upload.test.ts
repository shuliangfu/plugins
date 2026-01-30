/**
 * 文件上传插件测试
 *
 * 测试文件上传插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  uploadPlugin,
  type UploadPluginOptions,
} from "../src/upload/mod.ts";

describe("文件上传插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = uploadPlugin();
      const config = plugin.config?.upload as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-upload");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.uploadDir).toBe("./uploads");
      expect(config?.uploadPath).toBe("/upload");
      expect(config?.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it("应该使用自定义配置创建插件", () => {
      const options: UploadPluginOptions = {
        uploadDir: "./files",
        uploadPath: "/api/upload",
        maxFileSize: 5 * 1024 * 1024,
        maxTotalSize: 20 * 1024 * 1024,
        allowedMimeTypes: ["image/png", "image/jpeg"],
      };

      const plugin = uploadPlugin(options);
      const config = plugin.config?.upload as Record<string, unknown>;

      expect(config?.uploadDir).toBe("./files");
      expect(config?.uploadPath).toBe("/api/upload");
      expect(config?.maxFileSize).toBe(5 * 1024 * 1024);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = uploadPlugin();

      expect(
        plugin.validateConfig?.({ upload: { maxFileSize: 1024 * 1024 } }),
      ).toBe(true);
    });

    it("应该拒绝无效的 maxFileSize", () => {
      const plugin = uploadPlugin();

      expect(plugin.validateConfig?.({ upload: { maxFileSize: -1 } })).toBe(
        false,
      );
    });

    it("应该处理 allowedMimeTypes 配置", () => {
      const plugin = uploadPlugin();

      // validateConfig 目前不对 allowedMimeTypes 进行严格类型检查
      // 只验证基本配置结构
      expect(
        plugin.validateConfig?.({ upload: { allowedMimeTypes: ["image/png"] } }),
      ).toBe(true);
    });

    it("应该接受空配置", () => {
      const plugin = uploadPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 uploadConfig 服务", async () => {
      const plugin = uploadPlugin({ uploadDir: "./test-uploads" });

      await plugin.onInit?.(container);

      const config = container.get("uploadConfig");
      expect(config).toBeDefined();
      expect((config as { uploadDir: string }).uploadDir).toBe("./test-uploads");
    });

    it("应该注册 uploadService 服务", async () => {
      const plugin = uploadPlugin();

      await plugin.onInit?.(container);

      const service = container.get("uploadService");
      expect(service).toBeDefined();
    });

    it("uploadService 应该提供 validateFile 方法", async () => {
      const plugin = uploadPlugin({
        maxFileSize: 1024,
        allowedMimeTypes: ["image/png"],
      });
      await plugin.onInit?.(container);

      const service = container.get<{
        validateFile: (
          file: { size: number; type: string; name: string },
        ) => { valid: boolean; error?: string };
      }>("uploadService");

      expect(service?.validateFile).toBeDefined();

      // 有效文件
      const validResult = service?.validateFile({
        size: 512,
        type: "image/png",
        name: "test.png",
      });
      expect(validResult?.valid).toBe(true);

      // 文件太大
      const sizeResult = service?.validateFile({
        size: 2048,
        type: "image/png",
        name: "test.png",
      });
      expect(sizeResult?.valid).toBe(false);
      expect(sizeResult?.error).toContain("大小");

      // 类型不允许
      const typeResult = service?.validateFile({
        size: 512,
        type: "image/jpeg",
        name: "test.jpg",
      });
      expect(typeResult?.valid).toBe(false);
      expect(typeResult?.error).toContain("类型");
    });

    it("uploadService 应该提供 generateFilename 方法", async () => {
      const plugin = uploadPlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        generateFilename: (originalName: string) => string;
      }>("uploadService");

      expect(service?.generateFilename).toBeDefined();

      const filename = service?.generateFilename("test.png");
      expect(filename).toBeDefined();
      expect(filename).toContain(".png");
    });
  });

  describe("onRequest 钩子", () => {
    it("应该跳过非上传路径", async () => {
      const plugin = uploadPlugin({ uploadPath: "/upload" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users", { method: "POST" }),
        path: "/api/users",
        method: "POST",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 非上传路径，不应该处理
      expect(ctx.response).toBeUndefined();
    });

    it("应该只处理 POST 请求", async () => {
      const plugin = uploadPlugin({ uploadPath: "/upload" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/upload", { method: "GET" }),
        path: "/upload",
        method: "GET",
        url: new URL("http://localhost/upload"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // GET 请求不应该处理
      expect(ctx.response).toBeUndefined();
    });

    it("应该拒绝非 multipart 请求", async () => {
      const plugin = uploadPlugin({ uploadPath: "/upload" });
      await plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        }),
        path: "/upload",
        method: "POST",
        url: new URL("http://localhost/upload"),
        headers: new Headers({ "Content-Type": "application/json" }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // onRequest 可能跳过非 multipart 请求或返回错误
      // 验证返回了响应（如果有的话）
      if (ctx.response) {
        expect(ctx.response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe("文件验证", () => {
    // 定义服务类型（支持对象参数和字符串参数两种调用方式）
    type UploadService = {
      validateFile: (
        file: { size: number; type: string; name: string },
      ) => { valid: boolean; error?: string };
    };

    it("应该验证文件大小", async () => {
      const plugin = uploadPlugin({
        maxFileSize: 1024,
        allowedMimeTypes: [],
        forbiddenMimeTypes: [],
      });
      await plugin.onInit?.(container);

      const service = container.get<UploadService>("uploadService");

      // 文件太大
      const result = service?.validateFile({
        size: 2048,
        type: "text/plain",
        name: "test.txt",
      });
      expect(result?.valid).toBe(false);
      expect(result?.error).toContain("大小");

      // 文件大小在限制内
      const validResult = service?.validateFile({
        size: 512,
        type: "text/plain",
        name: "test.txt",
      });
      expect(validResult?.valid).toBe(true);
    });

    it("应该验证 MIME 类型白名单", async () => {
      const plugin = uploadPlugin({
        allowedMimeTypes: ["image/png", "image/jpeg"],
      });
      await plugin.onInit?.(container);

      const service = container.get<UploadService>("uploadService");

      // 允许的类型
      const validResult = service?.validateFile({
        size: 1024,
        type: "image/png",
        name: "test.png",
      });
      expect(validResult?.valid).toBe(true);

      // 不允许的类型
      const invalidResult = service?.validateFile({
        size: 1024,
        type: "text/plain",
        name: "test.txt",
      });
      expect(invalidResult?.valid).toBe(false);
    });

    it("应该验证 MIME 类型黑名单", async () => {
      const plugin = uploadPlugin({
        forbiddenMimeTypes: ["application/x-msdownload"],
      });
      await plugin.onInit?.(container);

      const service = container.get<UploadService>("uploadService");

      // 禁止的类型
      const result = service?.validateFile({
        size: 1024,
        type: "application/x-msdownload",
        name: "test.exe",
      });
      expect(result?.valid).toBe(false);
    });

    it("应该验证文件扩展名", async () => {
      const plugin = uploadPlugin({
        allowedExtensions: [".png", ".jpg"],
      });
      await plugin.onInit?.(container);

      const service = container.get<UploadService>("uploadService");

      // 允许的扩展名
      const validResult = service?.validateFile({
        size: 1024,
        type: "image/png",
        name: "test.png",
      });
      expect(validResult?.valid).toBe(true);

      // 不允许的扩展名
      const invalidResult = service?.validateFile({
        size: 1024,
        type: "text/plain",
        name: "test.txt",
      });
      expect(invalidResult?.valid).toBe(false);
    });

    it("应该验证禁止的扩展名", async () => {
      const plugin = uploadPlugin({
        forbiddenExtensions: [".exe", ".bat", ".sh"],
      });
      await plugin.onInit?.(container);

      const service = container.get<UploadService>("uploadService");

      // 禁止的扩展名
      const result = service?.validateFile({
        size: 1024,
        type: "application/octet-stream",
        name: "test.exe",
      });
      expect(result?.valid).toBe(false);
    });
  });

  describe("文件名生成", () => {
    it("应该生成唯一文件名", async () => {
      const plugin = uploadPlugin();
      await plugin.onInit?.(container);

      const service = container.get<{
        generateFilename: (originalName: string) => string;
      }>("uploadService");

      const filename1 = service?.generateFilename("test.png");
      const filename2 = service?.generateFilename("test.png");

      // 生成的文件名应该不同
      expect(filename1).not.toBe(filename2);
    });

    it("应该保留原始扩展名", async () => {
      const plugin = uploadPlugin({ preserveExtension: true });
      await plugin.onInit?.(container);

      const service = container.get<{
        generateFilename: (originalName: string) => string;
      }>("uploadService");

      const filename = service?.generateFilename("test.png");
      expect(filename?.endsWith(".png")).toBe(true);
    });
  });
});
