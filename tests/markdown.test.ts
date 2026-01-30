/**
 * Markdown 渲染插件测试
 *
 * 测试 Markdown 渲染插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  markdownPlugin,
  type MarkdownPluginOptions,
} from "../src/markdown/mod.ts";

describe("Markdown 渲染插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = markdownPlugin();
      const config = plugin.config?.markdown as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-markdown");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.routePrefix).toBe("/docs");
      expect(config?.frontMatter).toBe(true);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: MarkdownPluginOptions = {
        routePrefix: "/blog",
        contentDir: "./content",
        toc: true,
        frontMatter: true,
      };

      const plugin = markdownPlugin(options);
      const config = plugin.config?.markdown as Record<string, unknown>;

      expect(config?.routePrefix).toBe("/blog");
      expect(config?.contentDir).toBe("./content");
      expect(config?.toc).toBe(true);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = markdownPlugin();

      expect(
        plugin.validateConfig?.({ markdown: { routePrefix: "/docs" } }),
      ).toBe(true);
    });

    it("应该接受空配置", () => {
      const plugin = markdownPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 markdownConfig 服务", () => {
      const plugin = markdownPlugin({ routePrefix: "/blog" });

      plugin.onInit?.(container);

      const config = container.get("markdownConfig");
      expect(config).toBeDefined();
      expect((config as { routePrefix: string }).routePrefix).toBe("/blog");
    });

    it("应该注册 markdownService 服务", () => {
      const plugin = markdownPlugin();

      plugin.onInit?.(container);

      const service = container.get("markdownService");
      expect(service).toBeDefined();
    });

    it("markdownService 应该提供 render 方法", () => {
      const plugin = markdownPlugin();
      plugin.onInit?.(container);

      // render 方法返回 MarkdownResult 对象，包含 html、frontMatter、toc
      const service = container.get<{
        render: (content: string) => {
          html: string;
          frontMatter: Record<string, unknown>;
          toc: Array<{ level: number; text: string; id: string }>;
        };
      }>("markdownService");

      expect(service?.render).toBeDefined();
      expect(typeof service?.render).toBe("function");
    });

    it("markdownService 应该提供 renderFile 方法", () => {
      const plugin = markdownPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        renderFile: (path: string) => Promise<{
          html: string;
          frontMatter: Record<string, unknown>;
          toc: Array<{ level: number; text: string; id: string }>;
        }>;
      }>("markdownService");

      expect(service?.renderFile).toBeDefined();
      expect(typeof service?.renderFile).toBe("function");
    });
  });

  describe("markdownService", () => {
    // 定义服务类型
    type MarkdownService = {
      render: (content: string) => {
        html: string;
        frontMatter: Record<string, unknown>;
        toc: Array<{ level: number; text: string; id: string }>;
      };
    };

    it("应该渲染基本 Markdown", () => {
      const plugin = markdownPlugin();
      plugin.onInit?.(container);

      const service = container.get<MarkdownService>("markdownService");

      const markdown = "# Hello World\n\nThis is a **paragraph**.";
      const result = service?.render(markdown);

      expect(result?.html).toContain("<h1");
      expect(result?.html).toContain("Hello World");
      expect(result?.html).toContain("<p>");
      expect(result?.html).toContain("<strong>paragraph</strong>");
    });

    it("应该渲染代码块", () => {
      const plugin = markdownPlugin();
      plugin.onInit?.(container);

      const service = container.get<MarkdownService>("markdownService");

      const markdown = "```javascript\nconst x = 1;\n```";
      const result = service?.render(markdown);

      expect(result?.html).toContain("<pre>");
      expect(result?.html).toContain("<code");
      expect(result?.html).toContain("const x = 1;");
    });

    it("应该渲染链接", () => {
      const plugin = markdownPlugin();
      plugin.onInit?.(container);

      const service = container.get<MarkdownService>("markdownService");

      const markdown = "[Click here](https://example.com)";
      const result = service?.render(markdown);

      expect(result?.html).toContain("<a");
      expect(result?.html).toContain('href="https://example.com"');
      expect(result?.html).toContain("Click here");
    });

    it("应该渲染列表", () => {
      const plugin = markdownPlugin();
      plugin.onInit?.(container);

      const service = container.get<MarkdownService>("markdownService");

      const markdown = "- Item 1\n- Item 2\n- Item 3";
      const result = service?.render(markdown);

      expect(result?.html).toContain("<ul>");
      expect(result?.html).toContain("<li>");
      expect(result?.html).toContain("Item 1");
    });

    it("应该解析 Front Matter", () => {
      const plugin = markdownPlugin({ frontMatter: true });
      plugin.onInit?.(container);

      const service = container.get<MarkdownService>("markdownService");

      const markdown = `---
title: My Post
author: John
date: 2024-01-01
---

# Content here`;

      // render 方法返回的结果包含 frontMatter
      const result = service?.render(markdown);

      expect(result?.frontMatter.title).toBe("My Post");
      expect(result?.frontMatter.author).toBe("John");
      expect(result?.html).toContain("<h1");
      expect(result?.html).toContain("Content here");
    });

    it("应该生成目录", () => {
      const plugin = markdownPlugin({ toc: true });
      plugin.onInit?.(container);

      const service = container.get<MarkdownService>("markdownService");

      const markdown = `# Heading 1
## Heading 2
### Heading 3
## Another Heading 2`;

      // render 方法返回的结果包含 toc
      const result = service?.render(markdown);

      expect(result?.toc.length).toBe(4);
      expect(result?.toc[0].level).toBe(1);
      expect(result?.toc[0].text).toBe("Heading 1");
      expect(result?.toc[1].level).toBe(2);
      expect(result?.toc[2].level).toBe(3);
    });
  });

  describe("onRequest 钩子", () => {
    it("应该跳过非 Markdown 路径", async () => {
      const plugin = markdownPlugin({ routePrefix: "/docs" });
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

      // 不匹配路径，不应该处理
      expect(ctx.response).toBeUndefined();
    });

    it("应该只处理 GET 请求", async () => {
      const plugin = markdownPlugin({ routePrefix: "/docs" });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/docs/readme", { method: "POST" }),
        path: "/docs/readme",
        method: "POST",
        url: new URL("http://localhost/docs/readme"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // POST 请求不应该处理
      expect(ctx.response).toBeUndefined();
    });
  });
});
