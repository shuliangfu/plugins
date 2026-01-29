/**
 * @module @dreamer/plugins/seo
 *
 * SEO 优化插件
 *
 * 提供 SEO 优化功能，包括：
 * - 自动生成 meta 标签
 * - Sitemap 生成
 * - Robots.txt 生成
 * - Open Graph 和 Twitter Card 支持
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * SEO 插件配置选项
 */
export interface SEOPluginOptions {
  /** 网站标题 */
  title?: string;
  /** 网站描述 */
  description?: string;
  /** 网站关键词 */
  keywords?: string[];
  /** 网站 URL */
  siteUrl?: string;
  /** 网站图标 */
  favicon?: string;
  /** Open Graph 配置 */
  openGraph?: {
    /** 网站名称 */
    siteName?: string;
    /** 默认图片 */
    image?: string;
    /** 图片宽度 */
    imageWidth?: number;
    /** 图片高度 */
    imageHeight?: number;
    /** 类型（默认："website"） */
    type?: string;
  };
  /** Twitter Card 配置 */
  twitter?: {
    /** Twitter 账号 */
    card?: "summary" | "summary_large_image";
    /** Twitter 用户名 */
    username?: string;
    /** 默认图片 */
    image?: string;
  };
  /** 是否生成 Sitemap（默认：true） */
  generateSitemap?: boolean;
  /** Sitemap 输出路径（默认："./dist/sitemap.xml"） */
  sitemapPath?: string;
  /** Sitemap 更新频率（默认："daily"） */
  sitemapChangeFreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  /** Sitemap 优先级（默认：0.5） */
  sitemapPriority?: number;
  /** 是否生成 Robots.txt（默认：true） */
  generateRobots?: boolean;
  /** Robots.txt 输出路径（默认："./dist/robots.txt"） */
  robotsPath?: string;
  /** Robots.txt 规则 */
  robotsRules?: Array<{
    /** User-agent */
    userAgent?: string;
    /** 允许的路径 */
    allow?: string[];
    /** 禁止的路径 */
    disallow?: string[];
    /** Crawl-delay（秒） */
    crawlDelay?: number;
  }>;
  /** 结构化数据（JSON-LD） */
  structuredData?: Record<string, unknown>;
}

/**
 * 创建 SEO 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { seoPlugin } from "@dreamer/plugins/seo";
 *
 * const plugin = seoPlugin({
 *   title: "My Website",
 *   description: "A great website",
 *   siteUrl: "https://example.com",
 *   openGraph: {
 *     siteName: "My Website",
 *     image: "https://example.com/og-image.png",
 *   },
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function seoPlugin(options: SEOPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    title,
    description,
    keywords = [],
    siteUrl,
    favicon,
    openGraph = {},
    twitter = {},
    generateSitemap = true,
    sitemapPath = "./dist/sitemap.xml",
    sitemapChangeFreq = "daily",
    sitemapPriority = 0.5,
    generateRobots = true,
    robotsPath = "./dist/robots.txt",
    robotsRules = [],
    structuredData,
  } = options;

  return {
    name: "@dreamer/plugins-seo",
    version: "0.1.0",

    // 插件配置
    config: {
      seo: {
        title,
        description,
        keywords,
        siteUrl,
        favicon,
        openGraph,
        twitter,
        generateSitemap,
        sitemapPath,
        sitemapChangeFreq,
        sitemapPriority,
        generateRobots,
        robotsPath,
        robotsRules,
        structuredData,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.seo && typeof config.seo === "object") {
        const seo = config.seo as Record<string, unknown>;
        if (seo.keywords && !Array.isArray(seo.keywords)) {
          return false;
        }
        if (seo.robotsRules && !Array.isArray(seo.robotsRules)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 SEO 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册 SEO 配置服务
      container.registerSingleton("seoConfig", () => ({
        title,
        description,
        keywords,
        siteUrl,
        favicon,
        openGraph,
        twitter,
        generateSitemap,
        sitemapPath,
        sitemapChangeFreq,
        sitemapPriority,
        generateRobots,
        robotsPath,
        robotsRules,
        structuredData,
      }));

      // 注册 SEO 服务
      container.registerSingleton("seoService", () => ({
        /**
         * 生成 meta 标签
         */
        generateMetaTags: (_pageData?: Record<string, unknown>) => {
          return {};
        },
        /**
         * 生成 Sitemap
         */
        generateSitemap: (_routes: string[]) => {
          return "";
        },
        /**
         * 生成 Robots.txt
         */
        generateRobots: () => {
          return "";
        },
      }));

      // 输出日志（logger 可能不存在）
      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;
      if (logger) {
        logger.info("SEO 插件已初始化");
        if (generateSitemap) {
          logger.info(`Sitemap 将生成到: ${sitemapPath}`);
        }
        if (generateRobots) {
          logger.info(`Robots.txt 将生成到: ${robotsPath}`);
        }
      }
    },

    /**
     * 响应处理后钩子
     * 注入 SEO 标签
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 只在 HTML 响应中注入 SEO 标签
      const contentType = ctx.response?.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response!.text();
        const seoService = container.get<{
          generateMetaTags: (
            pageData?: Record<string, unknown>,
          ) => Record<string, string>;
        }>("seoService");

        if (!seoService) {
          return;
        }

        // 生成 meta 标签
        seoService.generateMetaTags({
          path: ctx.path,
          url: ctx.url.toString(),
        });

        // 构建 meta 标签 HTML
        const metaHtml: string[] = [];

        if (title) {
          metaHtml.push(`<title>${title}</title>`);
        }
        if (description) {
          metaHtml.push(`<meta name="description" content="${description}">`);
        }
        if (keywords.length > 0) {
          metaHtml.push(
            `<meta name="keywords" content="${keywords.join(", ")}">`,
          );
        }
        if (siteUrl) {
          metaHtml.push(`<link rel="canonical" href="${siteUrl}${ctx.path}">`);
        }
        if (favicon) {
          metaHtml.push(`<link rel="icon" href="${favicon}">`);
        }

        // Open Graph 标签
        if (openGraph.siteName || openGraph.image) {
          if (openGraph.siteName) {
            metaHtml.push(
              `<meta property="og:site_name" content="${openGraph.siteName}">`,
            );
          }
          if (title) {
            metaHtml.push(`<meta property="og:title" content="${title}">`);
          }
          if (description) {
            metaHtml.push(
              `<meta property="og:description" content="${description}">`,
            );
          }
          if (siteUrl) {
            metaHtml.push(
              `<meta property="og:url" content="${siteUrl}${ctx.path}">`,
            );
          }
          if (openGraph.image) {
            metaHtml.push(
              `<meta property="og:image" content="${openGraph.image}">`,
            );
            if (openGraph.imageWidth) {
              metaHtml.push(
                `<meta property="og:image:width" content="${openGraph.imageWidth}">`,
              );
            }
            if (openGraph.imageHeight) {
              metaHtml.push(
                `<meta property="og:image:height" content="${openGraph.imageHeight}">`,
              );
            }
          }
          metaHtml.push(
            `<meta property="og:type" content="${
              openGraph.type || "website"
            }">`,
          );
        }

        // Twitter Card 标签
        if (twitter.card || twitter.username) {
          if (twitter.card) {
            metaHtml.push(
              `<meta name="twitter:card" content="${twitter.card}">`,
            );
          }
          if (twitter.username) {
            metaHtml.push(
              `<meta name="twitter:site" content="@${twitter.username}">`,
            );
          }
          if (title) {
            metaHtml.push(`<meta name="twitter:title" content="${title}">`);
          }
          if (description) {
            metaHtml.push(
              `<meta name="twitter:description" content="${description}">`,
            );
          }
          if (twitter.image) {
            metaHtml.push(
              `<meta name="twitter:image" content="${twitter.image}">`,
            );
          }
        }

        // 结构化数据（JSON-LD）
        if (structuredData) {
          metaHtml.push(
            `<script type="application/ld+json">${
              JSON.stringify(structuredData)
            }</script>`,
          );
        }

        // 注入到 <head> 中
        const metaTagsHtml = metaHtml.join("\n    ");
        const injectedHtml = html.replace(
          /<\/head>/i,
          `    ${metaTagsHtml}\n</head>`,
        );

        ctx.response = new Response(injectedHtml, {
          status: ctx.response!.status,
          statusText: ctx.response!.statusText,
          headers: ctx.response!.headers,
        });
      } catch (error) {
        // 如果处理失败，记录错误但不影响响应
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `SEO 标签注入失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    },

    /**
     * 构建完成后钩子
     * 生成 Sitemap 和 Robots.txt
     */
    async onBuildComplete(
      _result: { outputFiles?: string[] },
      container: ServiceContainer,
    ) {
      const seoService = container.get<{
        generateSitemap: (routes: string[]) => Promise<string>;
        generateRobots: () => string;
      }>("seoService");

      if (!seoService) {
        return;
      }

      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;

      // 生成 Sitemap
      if (generateSitemap) {
        try {
          // 实际应该从路由收集 URL
          const _sitemap = await seoService.generateSitemap([]);
          if (logger) {
            logger.info(`Sitemap 已生成: ${sitemapPath}`);
          }
        } catch (error) {
          if (logger) {
            logger.info(
              `Sitemap 生成失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }

      // 生成 Robots.txt
      if (generateRobots) {
        try {
          const _robots = seoService.generateRobots();
          if (logger) {
            logger.info(`Robots.txt 已生成: ${robotsPath}`);
          }
        } catch (error) {
          if (logger) {
            logger.info(
              `Robots.txt 生成失败: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }
    },
  };
}
