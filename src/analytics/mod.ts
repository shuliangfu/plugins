/**
 * @module @dreamer/plugins/analytics
 *
 * 分析统计插件
 *
 * 提供分析统计功能，包括：
 * - Google Analytics 集成
 * - 自定义事件追踪
 * - 性能监控
 * - 用户行为分析
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import { getEnv } from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";

/**
 * Analytics 插件配置选项
 */
export interface AnalyticsPluginOptions {
  /** Google Analytics ID（GA4） */
  gaId?: string;
  /** Google Analytics 4 Measurement ID */
  ga4Id?: string;
  /** 是否启用页面浏览追踪（默认：true） */
  trackPageviews?: boolean;
  /** 是否启用事件追踪（默认：true） */
  trackEvents?: boolean;
  /** 是否启用性能监控（默认：false） */
  trackPerformance?: boolean;
  /** 是否启用用户行为分析（默认：false） */
  trackUserBehavior?: boolean;
  /** 自定义事件配置 */
  customEvents?: Array<{
    /** 事件名称 */
    name: string;
    /** 事件类别 */
    category?: string;
    /** 事件标签 */
    label?: string;
    /** 事件值 */
    value?: number;
  }>;
  /** 是否启用调试模式（默认：false） */
  debug?: boolean;
  /** 是否在开发环境禁用（默认：true） */
  disableInDev?: boolean;
  /** 其他分析服务配置 */
  otherServices?: Array<{
    /** 服务名称 */
    name: string;
    /** 服务 ID 或配置 */
    id?: string;
    /** 服务配置 */
    config?: Record<string, unknown>;
  }>;
}

/**
 * 创建 Analytics 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { analyticsPlugin } from "@dreamer/plugins/analytics";
 *
 * const plugin = analyticsPlugin({
 *   ga4Id: "G-XXXXXXXXXX",
 *   trackPageviews: true,
 *   trackPerformance: true,
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function analyticsPlugin(
  options: AnalyticsPluginOptions = {},
): Plugin {
  // 解构配置选项，设置默认值
  const {
    gaId,
    ga4Id,
    trackPageviews = true,
    trackEvents = true,
    trackPerformance = false,
    trackUserBehavior = false,
    customEvents = [],
    debug = false,
    disableInDev = true,
    otherServices = [],
  } = options;

  return {
    name: "@dreamer/plugins-analytics",
    version: "0.1.0",

    // 插件配置
    config: {
      analytics: {
        gaId,
        ga4Id,
        trackPageviews,
        trackEvents,
        trackPerformance,
        trackUserBehavior,
        customEvents,
        debug,
        disableInDev,
        otherServices,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.analytics && typeof config.analytics === "object") {
        const analytics = config.analytics as Record<string, unknown>;
        if (analytics.customEvents && !Array.isArray(analytics.customEvents)) {
          return false;
        }
        if (
          analytics.otherServices && !Array.isArray(analytics.otherServices)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 Analytics 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册 Analytics 配置服务
      container.registerSingleton("analyticsConfig", () => ({
        gaId,
        ga4Id,
        trackPageviews,
        trackEvents,
        trackPerformance,
        trackUserBehavior,
        customEvents,
        debug,
        disableInDev,
        otherServices,
      }));

      // 注册 Analytics 服务
      container.registerSingleton("analyticsService", () => ({
        /**
         * 追踪页面浏览
         */
        trackPageview: (path: string, title?: string) => {
          if (debug) {
            console.log("[Analytics] Pageview:", path, title);
          }
        },
        /**
         * 追踪事件
         */
        trackEvent: (
          name: string,
          category?: string,
          label?: string,
          value?: number,
        ) => {
          if (debug) {
            console.log("[Analytics] Event:", name, category, label, value);
          }
        },
        /**
         * 追踪性能指标
         */
        trackPerformance: (metrics: Record<string, number>) => {
          if (debug) {
            console.log("[Analytics] Performance:", metrics);
          }
        },
        /**
         * 追踪用户行为
         */
        trackUserBehavior: (
          action: string,
          data?: Record<string, unknown>,
        ) => {
          if (debug) {
            console.log("[Analytics] User Behavior:", action, data);
          }
        },
      }));

      // 输出日志（logger 可能不存在）
      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;
      if (logger) {
        logger.info("Analytics 插件已初始化");
        if (gaId || ga4Id) {
          logger.info(`Google Analytics: ${gaId || ga4Id}`);
        }
        if (otherServices.length > 0) {
          logger.info(
            `其他分析服务: ${otherServices.map((s) => s.name).join(", ")}`,
          );
        }
      }
    },

    /**
     * 请求处理前钩子
     * 记录请求开始时间（用于性能监控）
     */
    onRequest(ctx: RequestContext) {
      // 检查是否在开发环境且禁用了分析
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";
      if (disableInDev && isDev) {
        return;
      }

      // 记录请求开始时间（用于性能监控）
      if (trackPerformance) {
        (ctx as Record<string, unknown>).analyticsStartTime = Date.now();
      }
    },

    /**
     * 响应处理后钩子
     * 追踪页面浏览和性能指标，注入分析脚本
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 检查是否在开发环境且禁用了分析
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || getEnv("NODE_ENV") ||
          "dev") === "dev";
      if (disableInDev && isDev) {
        return;
      }

      const analyticsService = container.get<{
        trackPageview: (path: string, title?: string) => void;
        trackPerformance: (metrics: Record<string, number>) => void;
      }>("analyticsService");

      if (!analyticsService) {
        return;
      }

      // 追踪页面浏览
      if (trackPageviews) {
        analyticsService.trackPageview(ctx.path);
      }

      // 追踪性能指标
      if (trackPerformance) {
        const startTime = (ctx as Record<string, unknown>).analyticsStartTime as
          | number
          | undefined;
        if (startTime) {
          const duration = Date.now() - startTime;
          analyticsService.trackPerformance({
            pageLoadTime: duration,
          });
        }
      }

      // 只在 HTML 响应中注入分析脚本
      const contentType = ctx.response?.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      // 检查是否有任何分析服务需要注入
      const hasAnalyticsServices = ga4Id || gaId || otherServices.length > 0;
      if (!hasAnalyticsServices) {
        return; // 没有配置任何分析服务，不需要处理
      }

      try {
        const html = await ctx.response!.text();
        const analyticsScripts: string[] = [];

        // Google Analytics 4
        if (ga4Id) {
          analyticsScripts.push(`
    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${ga4Id}');
    </script>`);
        }

        // Google Analytics (Universal Analytics)
        if (gaId) {
          analyticsScripts.push(`
    <!-- Google Analytics -->
    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      ga('create', '${gaId}', 'auto');
      ga('send', 'pageview');
    </script>`);
        }

        // 其他分析服务
        for (const service of otherServices) {
          if (service.name === "plausible" && service.id) {
            analyticsScripts.push(`
    <!-- Plausible Analytics -->
    <script defer data-domain="${service.id}" src="https://plausible.io/js/script.js"></script>`);
          }
          // 可以添加更多分析服务
        }

        // 注入到 </head> 之前
        if (analyticsScripts.length > 0) {
          const scriptsHtml = analyticsScripts.join("\n");
          const injectedHtml = html.replace(
            /<\/head>/i,
            `${scriptsHtml}\n</head>`,
          );

          ctx.response = new Response(injectedHtml, {
            status: ctx.response!.status,
            statusText: ctx.response!.statusText,
            headers: ctx.response!.headers,
          });
        }
      } catch (error) {
        // 如果处理失败，记录错误但不影响响应
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `Analytics 脚本注入失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    },
  };
}
