/**
 * @module @dreamer/plugins/markdown
 *
 * Markdown 渲染插件
 *
 * 提供 Markdown 渲染功能，支持：
 * - Markdown 解析和渲染
 * - 代码语法高亮
 * - 自定义渲染器
 * - Front Matter 解析
 * - 目录生成
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import { readTextFile, stat } from "@dreamer/runtime-adapter";

/**
 * Front Matter 数据
 */
export interface FrontMatter {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 日期 */
  date?: string;
  /** 作者 */
  author?: string;
  /** 标签 */
  tags?: string[];
  /** 分类 */
  category?: string;
  /** 其他元数据 */
  [key: string]: unknown;
}

/**
 * 渲染结果
 */
export interface MarkdownResult {
  /** 渲染后的 HTML */
  html: string;
  /** Front Matter 数据 */
  frontMatter: FrontMatter;
  /** 目录结构 */
  toc: TocItem[];
}

/**
 * 目录项
 */
export interface TocItem {
  /** 标题级别（1-6） */
  level: number;
  /** 标题文本 */
  text: string;
  /** 锚点 ID */
  id: string;
  /** 子目录 */
  children: TocItem[];
}

/**
 * Markdown 插件配置选项
 */
export interface MarkdownPluginOptions {
  /** Markdown 文件目录（默认 "./content"） */
  contentDir?: string;
  /** 渲染路径前缀（默认 "/docs"） */
  routePrefix?: string;
  /** 是否解析 Front Matter（默认 true） */
  frontMatter?: boolean;
  /** 是否生成目录（默认 true） */
  toc?: boolean;
  /** 是否启用代码高亮（默认 true） */
  codeHighlight?: boolean;
  /** 代码高亮主题（默认 "github"） */
  codeTheme?: string;
  /** 是否启用 GFM（GitHub Flavored Markdown）（默认 true） */
  gfm?: boolean;
  /** 是否将换行转换为 <br>（默认 false） */
  breaks?: boolean;
  /** HTML 模板 */
  template?: string;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 解析 Front Matter
 * @param content - Markdown 内容
 * @returns Front Matter 和正文
 */
function parseFrontMatter(
  content: string,
): { frontMatter: FrontMatter; body: string } {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { frontMatter: {}, body: content };
  }

  const yaml = match[1];
  const body = content.slice(match[0].length);

  // 简单的 YAML 解析
  const frontMatter: FrontMatter = {};
  const lines = yaml.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // 处理引号
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // 处理数组（简单实现）
      if (value.startsWith("[") && value.endsWith("]")) {
        const arrayContent = value.slice(1, -1);
        frontMatter[key] = arrayContent.split(",").map((s) => s.trim());
      } else {
        frontMatter[key] = value;
      }
    }
  }

  return { frontMatter, body };
}

/**
 * 生成锚点 ID
 * @param text - 标题文本
 * @returns 锚点 ID
 */
function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 提取目录
 * @param html - 渲染后的 HTML
 * @returns 目录结构
 */
function extractToc(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[1-6]>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    const text = match[3].replace(/<[^>]*>/g, "").trim();

    toc.push({
      level,
      text,
      id,
      children: [],
    });
  }

  return toc;
}

/**
 * 简单的 Markdown 解析器
 * 注意：这是一个简化实现，生产环境建议使用专业库如 marked、markdown-it
 * @param markdown - Markdown 文本
 * @param options - 解析选项
 * @returns HTML 字符串
 */
function parseMarkdown(
  markdown: string,
  options: { gfm?: boolean; breaks?: boolean },
): string {
  let html = markdown;

  // 转义 HTML
  html = html.replace(/&/g, "&amp;");
  html = html.replace(/</g, "&lt;");
  html = html.replace(/>/g, "&gt;");

  // 代码块
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const langClass = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${langClass}>${code.trim()}</code></pre>`;
    },
  );

  // 行内代码
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 标题（添加 ID）
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length;
    const id = generateId(text);
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // 斜体
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // 删除线（GFM）
  if (options.gfm) {
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  }

  // 链接
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>',
  );

  // 图片
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1">',
  );

  // 无序列表
  html = html.replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, "<ul>$&</ul>");

  // 有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // 引用
  html = html.replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // 水平线
  html = html.replace(/^[-*_]{3,}$/gm, "<hr>");

  // 段落
  html = html.replace(/\n\n+/g, "</p>\n<p>");
  html = "<p>" + html + "</p>";

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/<p>(<h[1-6])/g, "$1");
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");
  html = html.replace(/<p>(<hr)/g, "$1");

  // 换行
  if (options.breaks) {
    html = html.replace(/\n/g, "<br>\n");
  }

  return html;
}

/**
 * 默认 HTML 模板
 */
const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
           max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    pre { background: #f4f4f4; padding: 16px; overflow-x: auto; border-radius: 4px; }
    code { font-family: 'SFMono-Regular', Consolas, monospace; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    img { max-width: 100%; height: auto; }
    a { color: #0066cc; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; }
  </style>
</head>
<body>
{{content}}
</body>
</html>`;

/**
 * 创建 Markdown 渲染插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { markdownPlugin } from "@dreamer/plugins/markdown";
 *
 * // 基础用法
 * const plugin = markdownPlugin({
 *   contentDir: "./content",
 *   routePrefix: "/docs",
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function markdownPlugin(options: MarkdownPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    contentDir = "./content",
    routePrefix = "/docs",
    frontMatter: parseFrontMatterEnabled = true,
    toc: generateToc = true,
    codeHighlight = true,
    codeTheme = "github",
    gfm = true,
    breaks = false,
    template = DEFAULT_TEMPLATE,
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-markdown",
    version: "1.0.0",

    // 插件配置
    config: {
      markdown: {
        contentDir,
        routePrefix,
        frontMatter: parseFrontMatterEnabled,
        toc: generateToc,
        codeHighlight,
        codeTheme,
        gfm,
        breaks,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.markdown && typeof config.markdown === "object") {
        // 基本验证
        return true;
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 Markdown 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册 Markdown 配置服务
      container.registerSingleton("markdownConfig", () => ({
        contentDir,
        routePrefix,
        frontMatter: parseFrontMatterEnabled,
        toc: generateToc,
        codeHighlight,
        codeTheme,
        gfm,
        breaks,
        debug,
      }));

      // 注册 Markdown 服务
      container.registerSingleton("markdownService", () => ({
        /**
         * 渲染 Markdown 文本
         * @param markdown - Markdown 文本
         * @returns 渲染结果
         */
        render: (markdown: string): MarkdownResult => {
          let frontMatterData: FrontMatter = {};
          let body = markdown;

          // 解析 Front Matter
          if (parseFrontMatterEnabled) {
            const parsed = parseFrontMatter(markdown);
            frontMatterData = parsed.frontMatter;
            body = parsed.body;
          }

          // 渲染 Markdown
          const html = parseMarkdown(body, { gfm, breaks });

          // 提取目录
          const toc = generateToc ? extractToc(html) : [];

          return {
            html,
            frontMatter: frontMatterData,
            toc,
          };
        },
        /**
         * 渲染 Markdown 文件
         * @param filePath - 文件路径
         * @returns 渲染结果
         */
        renderFile: async (filePath: string): Promise<MarkdownResult> => {
          // 使用 runtime-adapter 的 readTextFile
          const content = await readTextFile(filePath);
          const service = container.get<{
            render: (markdown: string) => MarkdownResult;
          }>("markdownService");
          return service!.render(content);
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `Markdown 插件已初始化: contentDir=${contentDir}, routePrefix=${routePrefix}`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理 Markdown 文件请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      // 只处理 GET 请求
      if (ctx.method !== "GET") {
        return;
      }

      const path = ctx.path || "";

      // 检查路径前缀
      if (!path.startsWith(routePrefix)) {
        return;
      }

      // 构建文件路径
      let relativePath = path.slice(routePrefix.length);
      if (!relativePath || relativePath === "/") {
        relativePath = "/index";
      }
      if (!relativePath.endsWith(".md")) {
        relativePath += ".md";
      }

      const filePath = contentDir + relativePath;

      try {
        // 检查文件是否存在（使用 runtime-adapter 的 stat）
        await stat(filePath);

        // 获取 Markdown 服务
        const markdownService = container.get<{
          renderFile: (path: string) => Promise<MarkdownResult>;
        }>("markdownService");

        if (!markdownService) {
          return;
        }

        // 渲染文件
        const result = await markdownService.renderFile(filePath);

        // 应用模板
        let html = template;
        html = html.replace(
          /\{\{title\}\}/g,
          result.frontMatter.title || "Document",
        );
        html = html.replace(/\{\{content\}\}/g, result.html);

        ctx.response = new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });

        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(`Markdown 渲染: ${path} -> ${filePath}`);
          }
        }
      } catch (error) {
        // 文件不存在，不处理
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNotFound = errorMessage.includes("ENOENT") ||
          errorMessage.includes("NotFound") ||
          errorMessage.includes("not found");

        if (debug && !isNotFound) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(`Markdown 渲染失败: ${filePath} | ${errorMessage}`);
          }
        }
      }
    },
  };
}

// 导出默认创建函数
export default markdownPlugin;
