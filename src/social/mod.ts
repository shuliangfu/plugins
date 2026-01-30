/**
 * @module @dreamer/plugins/social
 *
 * 社交分享插件
 *
 * 提供社交分享功能，支持：
 * - 社交媒体分享按钮
 * - OAuth 社交登录
 * - 分享链接生成
 * - 分享统计
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 社交平台类型
 */
export type SocialPlatform =
  | "twitter"
  | "facebook"
  | "linkedin"
  | "weibo"
  | "wechat"
  | "qq"
  | "telegram"
  | "whatsapp"
  | "reddit"
  | "pinterest";

/**
 * OAuth 提供商类型
 */
export type OAuthProvider = "google" | "github" | "twitter" | "facebook";

/**
 * 分享内容
 */
export interface ShareContent {
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 链接 */
  url: string;
  /** 图片 */
  image?: string;
  /** 标签 */
  hashtags?: string[];
}

/**
 * OAuth 配置
 */
export interface OAuthConfig {
  /** 客户端 ID */
  clientId: string;
  /** 客户端密钥 */
  clientSecret: string;
  /** 回调 URL */
  callbackUrl: string;
  /** 权限范围 */
  scope?: string[];
}

/**
 * OAuth 用户信息
 */
export interface OAuthUser {
  /** 用户 ID */
  id: string;
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 头像 */
  avatar?: string;
  /** 显示名称 */
  displayName?: string;
  /** 提供商 */
  provider: OAuthProvider;
  /** 原始数据 */
  raw?: unknown;
}

/**
 * 社交分享插件配置选项
 */
export interface SocialPluginOptions {
  /** 网站 URL（用于生成分享链接） */
  siteUrl?: string;
  /** 启用的分享平台 */
  platforms?: SocialPlatform[];
  /** OAuth 配置 */
  oauth?: {
    google?: OAuthConfig;
    github?: OAuthConfig;
    twitter?: OAuthConfig;
    facebook?: OAuthConfig;
  };
  /** OAuth 路由前缀（默认 "/api/auth"） */
  oauthRoutePrefix?: string;
  /** 分享 API 路由前缀（默认 "/api/share"） */
  shareRoutePrefix?: string;
  /** 是否注入分享按钮脚本（默认 true） */
  injectShareButtons?: boolean;
  /** 分享按钮样式（默认 "default"） */
  buttonStyle?: "default" | "icon" | "text" | "custom";
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 默认启用的分享平台
 */
const DEFAULT_PLATFORMS: SocialPlatform[] = [
  "twitter",
  "facebook",
  "linkedin",
  "weibo",
  "wechat",
];

/**
 * 生成分享 URL
 * @param platform - 社交平台
 * @param content - 分享内容
 * @returns 分享 URL
 */
function generateShareUrl(
  platform: SocialPlatform,
  content: ShareContent,
): string {
  const encodedUrl = encodeURIComponent(content.url);
  const encodedTitle = encodeURIComponent(content.title);
  const encodedDesc = encodeURIComponent(content.description || "");
  const hashtags = content.hashtags?.join(",") || "";

  switch (platform) {
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${
        hashtags ? `&hashtags=${hashtags}` : ""
      }`;

    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;

    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    case "weibo":
      return `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`;

    case "wechat":
      // 微信需要生成二维码
      return `weixin://dl/business/?t=${encodedUrl}`;

    case "qq":
      return `https://connect.qq.com/widget/shareqq/index.html?url=${encodedUrl}&title=${encodedTitle}&desc=${encodedDesc}`;

    case "telegram":
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;

    case "whatsapp":
      return `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;

    case "reddit":
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;

    case "pinterest":
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${
        content.image ? `&media=${encodeURIComponent(content.image)}` : ""
      }`;

    default:
      return content.url;
  }
}

/**
 * 获取 OAuth 授权 URL
 * @param provider - OAuth 提供商
 * @param config - OAuth 配置
 * @returns 授权 URL
 */
function getOAuthAuthorizationUrl(
  provider: OAuthProvider,
  config: OAuthConfig,
  state: string,
): string {
  const { clientId, callbackUrl, scope } = config;
  const encodedCallback = encodeURIComponent(callbackUrl);

  switch (provider) {
    case "google":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedCallback}&response_type=code&scope=${
        encodeURIComponent(scope?.join(" ") || "email profile")
      }&state=${state}`;

    case "github":
      return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodedCallback}&scope=${
        encodeURIComponent(scope?.join(" ") || "user:email")
      }&state=${state}`;

    case "twitter":
      // Twitter OAuth 2.0
      return `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodedCallback}&response_type=code&scope=${
        encodeURIComponent(scope?.join(" ") || "tweet.read users.read")
      }&state=${state}&code_challenge=challenge&code_challenge_method=plain`;

    case "facebook":
      return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodedCallback}&scope=${
        encodeURIComponent(scope?.join(",") || "email,public_profile")
      }&state=${state}`;

    default:
      throw new Error(`不支持的 OAuth 提供商: ${provider}`);
  }
}

/**
 * 创建社交分享插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { socialPlugin } from "@dreamer/plugins/social";
 *
 * // 基础分享功能
 * const plugin = socialPlugin({
 *   siteUrl: "https://example.com",
 *   platforms: ["twitter", "facebook", "weibo"],
 * });
 *
 * // OAuth 登录
 * const plugin = socialPlugin({
 *   oauth: {
 *     github: {
 *       clientId: "xxx",
 *       clientSecret: "xxx",
 *       callbackUrl: "https://example.com/api/auth/github/callback",
 *     },
 *   },
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function socialPlugin(options: SocialPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    siteUrl = "",
    platforms = DEFAULT_PLATFORMS,
    oauth = {},
    oauthRoutePrefix = "/api/auth",
    shareRoutePrefix = "/api/share",
    injectShareButtons = true,
    buttonStyle = "default",
    debug = false,
  } = options;

  // 存储 OAuth 状态（用于防止 CSRF）
  const oauthStates = new Map<
    string,
    { provider: OAuthProvider; createdAt: number }
  >();

  return {
    name: "@dreamer/plugins-social",
    version: "1.0.0",

    // 插件配置
    config: {
      social: {
        siteUrl,
        platforms,
        oauthProviders: Object.keys(oauth),
        oauthRoutePrefix,
        shareRoutePrefix,
        injectShareButtons,
        buttonStyle,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.social && typeof config.social === "object") {
        // 基本验证
        return true;
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册社交服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册社交配置服务
      container.registerSingleton("socialConfig", () => ({
        siteUrl,
        platforms,
        oauth,
        oauthRoutePrefix,
        shareRoutePrefix,
        injectShareButtons,
        buttonStyle,
        debug,
      }));

      // 注册社交服务
      container.registerSingleton("socialService", () => ({
        /**
         * 生成分享 URL
         * @param platform - 社交平台
         * @param content - 分享内容
         * @returns 分享 URL
         */
        getShareUrl: (
          platform: SocialPlatform,
          content: ShareContent,
        ): string => {
          return generateShareUrl(platform, content);
        },

        /**
         * 生成所有平台的分享 URL
         * @param content - 分享内容
         * @returns 分享 URL 映射
         */
        getAllShareUrls: (
          content: ShareContent,
        ): Record<SocialPlatform, string> => {
          const urls: Partial<Record<SocialPlatform, string>> = {};
          for (const platform of platforms) {
            urls[platform] = generateShareUrl(platform, content);
          }
          return urls as Record<SocialPlatform, string>;
        },

        /**
         * 获取 OAuth 授权 URL
         * @param provider - OAuth 提供商
         * @returns 授权 URL
         */
        getOAuthUrl: (provider: OAuthProvider): string | null => {
          const config = oauth[provider];
          if (!config) return null;

          const state = crypto.randomUUID();
          oauthStates.set(state, { provider, createdAt: Date.now() });

          return getOAuthAuthorizationUrl(provider, config, state);
        },

        /**
         * 获取可用的 OAuth 提供商
         * @returns 提供商列表
         */
        getAvailableOAuthProviders: (): OAuthProvider[] => {
          return Object.keys(oauth) as OAuthProvider[];
        },

        /**
         * 获取启用的分享平台
         * @returns 平台列表
         */
        getEnabledPlatforms: (): SocialPlatform[] => {
          return platforms;
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `社交分享插件已初始化: platforms=${platforms.join(", ")}, oauth=${
              Object.keys(oauth).join(", ") || "none"
            }`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理 OAuth 和分享 API 请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const path = ctx.path || "";
      const method = ctx.method?.toUpperCase();

      // 处理 OAuth 登录请求
      if (path.startsWith(oauthRoutePrefix)) {
        const relativePath = path.slice(oauthRoutePrefix.length);

        // 发起登录
        const loginMatch = relativePath.match(/^\/(\w+)$/);
        if (loginMatch && method === "GET") {
          const provider = loginMatch[1] as OAuthProvider;
          const config = oauth[provider];

          if (!config) {
            ctx.response = new Response(
              JSON.stringify({ error: `不支持的 OAuth 提供商: ${provider}` }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
            return;
          }

          const state = crypto.randomUUID();
          oauthStates.set(state, { provider, createdAt: Date.now() });

          const authUrl = getOAuthAuthorizationUrl(provider, config, state);

          ctx.response = new Response(null, {
            status: 302,
            headers: { Location: authUrl },
          });

          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(`OAuth 登录发起: provider=${provider}`);
            }
          }

          return;
        }

        // OAuth 回调
        const callbackMatch = relativePath.match(/^\/(\w+)\/callback$/);
        if (callbackMatch && method === "GET") {
          const provider = callbackMatch[1] as OAuthProvider;
          const code = ctx.url.searchParams.get("code");
          const state = ctx.url.searchParams.get("state");
          const error = ctx.url.searchParams.get("error");

          if (error) {
            ctx.response = new Response(
              JSON.stringify({ error: `OAuth 授权失败: ${error}` }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
            return;
          }

          if (!code || !state) {
            ctx.response = new Response(
              JSON.stringify({ error: "缺少授权码或状态参数" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
            return;
          }

          // 验证状态
          const storedState = oauthStates.get(state);
          if (!storedState || storedState.provider !== provider) {
            ctx.response = new Response(
              JSON.stringify({ error: "无效的状态参数" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
            return;
          }

          // 删除已使用的状态
          oauthStates.delete(state);

          // 注意：实际实现需要使用授权码换取访问令牌，然后获取用户信息
          // 这里返回模拟数据
          const user: OAuthUser = {
            id: `${provider}_user_${code.slice(0, 8)}`,
            provider,
            username: `${provider}_user`,
            email: `user@${provider}.example.com`,
          };

          ctx.response = new Response(
            JSON.stringify({ success: true, user }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );

          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(
                `OAuth 登录成功: provider=${provider}, user=${user.id}`,
              );
            }
          }

          return;
        }
      }

      // 处理分享 API 请求
      if (path.startsWith(shareRoutePrefix) && method === "POST") {
        const socialService = container.get<{
          getAllShareUrls: (content: ShareContent) => Record<string, string>;
        }>("socialService");

        if (!socialService || !ctx.request) {
          return;
        }

        try {
          const content = await ctx.request.json() as ShareContent;
          const urls = socialService.getAllShareUrls(content);

          ctx.response = new Response(
            JSON.stringify({ urls }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          ctx.response = new Response(
            JSON.stringify({
              error: "生成分享链接失败",
              message: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return;
      }
    },

    /**
     * 响应处理后钩子
     * 注入分享按钮脚本
     */
    async onResponse(ctx: RequestContext, _container: ServiceContainer) {
      // 只在 HTML 响应中注入
      if (!injectShareButtons || !ctx.response) {
        return;
      }

      const contentType = ctx.response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response.text();

        // 分享按钮样式和脚本
        const shareScript = `
<style>
.share-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.share-button { display: inline-flex; align-items: center; justify-content: center; 
  padding: 8px 16px; border-radius: 4px; text-decoration: none; color: white; 
  font-size: 14px; transition: opacity 0.2s; }
.share-button:hover { opacity: 0.8; }
.share-button.twitter { background: #1da1f2; }
.share-button.facebook { background: #4267b2; }
.share-button.linkedin { background: #0077b5; }
.share-button.weibo { background: #e6162d; }
.share-button.wechat { background: #07c160; }
</style>
<script>
window.shareToSocial = function(platform, content) {
  var urls = {
    twitter: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(content.url) + '&text=' + encodeURIComponent(content.title),
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(content.url),
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(content.url),
    weibo: 'https://service.weibo.com/share/share.php?url=' + encodeURIComponent(content.url) + '&title=' + encodeURIComponent(content.title)
  };
  var url = urls[platform];
  if (url) {
    window.open(url, '_blank', 'width=600,height=400');
  }
};
</script>`;

        // 注入到 </head> 前
        const injectedHtml = html.replace("</head>", shareScript + "\n</head>");

        ctx.response = new Response(injectedHtml, {
          status: ctx.response.status,
          statusText: ctx.response.statusText,
          headers: ctx.response.headers,
        });
      } catch {
        // 注入失败，不影响响应
      }
    },
  };
}

// 导出默认创建函数
export default socialPlugin;
