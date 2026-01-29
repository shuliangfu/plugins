/**
 * @module @dreamer/plugins/pwa
 *
 * PWA（渐进式 Web 应用）插件
 *
 * 提供 PWA 功能，包括：
 * - Service Worker 注册
 * - Web App Manifest
 * - 离线支持
 * - 推送通知
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * PWA 插件配置选项
 */
export interface PWAPluginOptions {
  /** 应用名称 */
  name?: string;
  /** 简短名称 */
  shortName?: string;
  /** 应用描述 */
  description?: string;
  /** 主题颜色 */
  themeColor?: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 显示模式（默认："standalone"） */
  display?: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  /** 启动 URL */
  startUrl?: string;
  /** 图标配置 */
  icons?: Array<{
    /** 图标路径 */
    src: string;
    /** 图标大小 */
    sizes: string;
    /** 图标类型 */
    type?: string;
    /** 用途（默认："any maskable"） */
    purpose?: string;
  }>;
  /** Service Worker 文件路径（默认："./sw.js"） */
  swPath?: string;
  /** Service Worker 作用域（默认："/"） */
  swScope?: string;
  /** 是否启用离线支持（默认：true） */
  offlineSupport?: boolean;
  /** 离线缓存策略（默认："networkFirst"） */
  cacheStrategy?:
    | "cacheFirst"
    | "networkFirst"
    | "staleWhileRevalidate"
    | "networkOnly"
    | "cacheOnly";
  /** 是否启用推送通知（默认：false） */
  pushNotifications?: boolean;
  /** 推送通知配置 */
  pushConfig?: {
    /** VAPID 公钥 */
    publicKey?: string;
    /** 推送服务 URL */
    serviceUrl?: string;
  };
  /** 是否启用安装提示（默认：true） */
  installPrompt?: boolean;
}

/**
 * 创建 PWA 插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { pwaPlugin } from "@dreamer/plugins/pwa";
 *
 * const plugin = pwaPlugin({
 *   name: "My App",
 *   shortName: "App",
 *   themeColor: "#3498db",
 *   offlineSupport: true,
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function pwaPlugin(options: PWAPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    name = "My App",
    shortName,
    description,
    themeColor = "#000000",
    backgroundColor = "#ffffff",
    display = "standalone",
    startUrl = "/",
    icons = [],
    swPath = "./sw.js",
    swScope = "/",
    offlineSupport = true,
    cacheStrategy = "networkFirst",
    pushNotifications = false,
    pushConfig = {},
    installPrompt = true,
  } = options;

  return {
    name: "@dreamer/plugins-pwa",
    version: "0.1.0",

    // 插件配置
    config: {
      pwa: {
        name,
        shortName: shortName || name,
        description,
        themeColor,
        backgroundColor,
        display,
        startUrl,
        icons,
        swPath,
        swScope,
        offlineSupport,
        cacheStrategy,
        pushNotifications,
        pushConfig,
        installPrompt,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config: Record<string, unknown>) => {
      if (config.pwa && typeof config.pwa === "object") {
        const pwa = config.pwa as Record<string, unknown>;
        if (pwa.icons && !Array.isArray(pwa.icons)) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册 PWA 服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册 PWA 配置服务
      container.registerSingleton("pwaConfig", () => ({
        name,
        shortName: shortName || name,
        description,
        themeColor,
        backgroundColor,
        display,
        startUrl,
        icons,
        swPath,
        swScope,
        offlineSupport,
        cacheStrategy,
        pushNotifications,
        pushConfig,
        installPrompt,
      }));

      // 注册 PWA 服务
      container.registerSingleton("pwaService", () => ({
        /**
         * 生成 Web App Manifest
         */
        generateManifest: () => ({
          name,
          short_name: shortName || name,
          description,
          theme_color: themeColor,
          background_color: backgroundColor,
          display,
          start_url: startUrl,
          icons,
        }),
        /**
         * 注册 Service Worker（客户端调用）
         */
        registerServiceWorker: async () => {
          // 在客户端调用
        },
        /**
         * 请求推送通知权限（客户端调用）
         */
        requestNotificationPermission: async () => {
          // 在客户端调用
        },
      }));

      // 输出日志（logger 可能不存在）
      const logger = container.has("logger")
        ? container.get<{ info: (msg: string) => void }>("logger")
        : null;
      if (logger) {
        logger.info("PWA 插件已初始化");
        if (offlineSupport) {
          logger.info(`Service Worker: ${swPath} (scope: ${swScope})`);
        }
        if (pushNotifications) {
          logger.info("推送通知已启用");
        }
      }
    },

    /**
     * 响应处理后钩子
     * 注入 PWA 相关标签
     */
    async onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 只在 HTML 响应中注入 PWA 相关标签
      const contentType = ctx.response?.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response!.text();
        const pwaService = container.get<{
          generateManifest: () => Record<string, unknown>;
        }>("pwaService");

        if (!pwaService) {
          return;
        }

        // 生成 manifest（用于后续可能的 manifest.json 路由）
        const _manifest = pwaService.generateManifest();
        const manifestUrl = "/manifest.json";

        // 构建 PWA 相关标签
        const pwaHtml: string[] = [];

        // Manifest 链接
        pwaHtml.push(`<link rel="manifest" href="${manifestUrl}">`);

        // 主题颜色
        pwaHtml.push(`<meta name="theme-color" content="${themeColor}">`);

        // 移动端优化
        pwaHtml.push('<meta name="mobile-web-app-capable" content="yes">');
        pwaHtml.push(
          `<meta name="apple-mobile-web-app-capable" content="yes">`,
        );
        if (name) {
          pwaHtml.push(
            `<meta name="apple-mobile-web-app-title" content="${name}">`,
          );
        }
        if (themeColor) {
          pwaHtml.push(
            `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
          );
        }

        // 图标（Apple Touch Icon）
        if (icons.length > 0) {
          const mainIcon = icons[0];
          pwaHtml.push(`<link rel="apple-touch-icon" href="${mainIcon.src}">`);
        }

        // Service Worker 注册脚本
        if (offlineSupport) {
          const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('${swPath}', {
            scope: '${swScope}'
          }).then(function(registration) {
            console.log('Service Worker registered:', registration.scope);
          }).catch(function(error) {
            console.log('Service Worker registration failed:', error);
          });
        });
      }
    </script>`;
          pwaHtml.push(swScript);
        }

        // 注入到 <head> 中
        const pwaTagsHtml = pwaHtml.join("\n    ");
        const injectedHtml = html.replace(
          /<\/head>/i,
          `    ${pwaTagsHtml}\n</head>`,
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
            `PWA 标签注入失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    },
  };
}
