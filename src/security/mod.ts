/**
 * @module @dreamer/plugins/security
 *
 * 安全头插件
 *
 * 提供 HTTP 安全头设置，支持：
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * CSP 指令配置
 */
export interface CspDirectives {
  /** 默认策略 */
  defaultSrc?: string[];
  /** 脚本策略 */
  scriptSrc?: string[];
  /** 样式策略 */
  styleSrc?: string[];
  /** 图片策略 */
  imgSrc?: string[];
  /** 字体策略 */
  fontSrc?: string[];
  /** 连接策略 */
  connectSrc?: string[];
  /** 媒体策略 */
  mediaSrc?: string[];
  /** 对象策略 */
  objectSrc?: string[];
  /** 框架策略 */
  frameSrc?: string[];
  /** 子资源策略 */
  childSrc?: string[];
  /** Worker 策略 */
  workerSrc?: string[];
  /** 表单提交策略 */
  formAction?: string[];
  /** 框架祖先策略 */
  frameAncestors?: string[];
  /** 基础 URI 策略 */
  baseUri?: string[];
  /** 升级不安全请求 */
  upgradeInsecureRequests?: boolean;
  /** 阻止混合内容 */
  blockAllMixedContent?: boolean;
  /** 报告 URI */
  reportUri?: string;
  /** 报告到 */
  reportTo?: string;
}

/**
 * 安全插件配置选项
 */
export interface SecurityPluginOptions {
  /** Content-Security-Policy 配置 */
  csp?: CspDirectives | false;
  /** X-Frame-Options（默认 "SAMEORIGIN"） */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** X-Content-Type-Options（默认 "nosniff"） */
  contentTypeOptions?: "nosniff" | false;
  /** X-XSS-Protection（默认 "1; mode=block"） */
  xssProtection?: string | false;
  /** Strict-Transport-Security 配置 */
  hsts?: {
    /** 最大有效期（秒，默认 31536000 = 1 年） */
    maxAge?: number;
    /** 是否包含子域名（默认 true） */
    includeSubDomains?: boolean;
    /** 是否预加载（默认 false） */
    preload?: boolean;
  } | false;
  /** Referrer-Policy（默认 "strict-origin-when-cross-origin"） */
  referrerPolicy?:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url"
    | false;
  /** Permissions-Policy 配置 */
  permissionsPolicy?: Record<string, string[]> | false;
  /** X-DNS-Prefetch-Control（默认 "off"） */
  dnsPrefetchControl?: "on" | "off" | false;
  /** X-Download-Options（默认 "noopen"） */
  downloadOptions?: "noopen" | false;
  /** X-Permitted-Cross-Domain-Policies（默认 "none"） */
  crossDomainPolicies?:
    | "none"
    | "master-only"
    | "by-content-type"
    | "all"
    | false;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 构建 CSP 头值
 * @param directives - CSP 指令配置
 * @returns CSP 头值字符串
 */
function buildCspHeader(directives: CspDirectives): string {
  const parts: string[] = [];

  // 处理各个指令
  if (directives.defaultSrc) {
    parts.push(`default-src ${directives.defaultSrc.join(" ")}`);
  }
  if (directives.scriptSrc) {
    parts.push(`script-src ${directives.scriptSrc.join(" ")}`);
  }
  if (directives.styleSrc) {
    parts.push(`style-src ${directives.styleSrc.join(" ")}`);
  }
  if (directives.imgSrc) {
    parts.push(`img-src ${directives.imgSrc.join(" ")}`);
  }
  if (directives.fontSrc) {
    parts.push(`font-src ${directives.fontSrc.join(" ")}`);
  }
  if (directives.connectSrc) {
    parts.push(`connect-src ${directives.connectSrc.join(" ")}`);
  }
  if (directives.mediaSrc) {
    parts.push(`media-src ${directives.mediaSrc.join(" ")}`);
  }
  if (directives.objectSrc) {
    parts.push(`object-src ${directives.objectSrc.join(" ")}`);
  }
  if (directives.frameSrc) {
    parts.push(`frame-src ${directives.frameSrc.join(" ")}`);
  }
  if (directives.childSrc) {
    parts.push(`child-src ${directives.childSrc.join(" ")}`);
  }
  if (directives.workerSrc) {
    parts.push(`worker-src ${directives.workerSrc.join(" ")}`);
  }
  if (directives.formAction) {
    parts.push(`form-action ${directives.formAction.join(" ")}`);
  }
  if (directives.frameAncestors) {
    parts.push(`frame-ancestors ${directives.frameAncestors.join(" ")}`);
  }
  if (directives.baseUri) {
    parts.push(`base-uri ${directives.baseUri.join(" ")}`);
  }
  if (directives.upgradeInsecureRequests) {
    parts.push("upgrade-insecure-requests");
  }
  if (directives.blockAllMixedContent) {
    parts.push("block-all-mixed-content");
  }
  if (directives.reportUri) {
    parts.push(`report-uri ${directives.reportUri}`);
  }
  if (directives.reportTo) {
    parts.push(`report-to ${directives.reportTo}`);
  }

  return parts.join("; ");
}

/**
 * 构建 HSTS 头值
 * @param options - HSTS 配置
 * @returns HSTS 头值字符串
 */
function buildHstsHeader(
  options: { maxAge?: number; includeSubDomains?: boolean; preload?: boolean },
): string {
  const { maxAge = 31536000, includeSubDomains = true, preload = false } =
    options;
  let value = `max-age=${maxAge}`;
  if (includeSubDomains) {
    value += "; includeSubDomains";
  }
  if (preload) {
    value += "; preload";
  }
  return value;
}

/**
 * 构建 Permissions-Policy 头值
 * @param policy - 权限策略配置
 * @returns Permissions-Policy 头值字符串
 */
function buildPermissionsPolicyHeader(
  policy: Record<string, string[]>,
): string {
  const parts: string[] = [];
  for (const [feature, allowList] of Object.entries(policy)) {
    if (allowList.length === 0) {
      parts.push(`${feature}=()`);
    } else {
      parts.push(`${feature}=(${allowList.join(" ")})`);
    }
  }
  return parts.join(", ");
}

/**
 * 创建安全头插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { securityPlugin } from "@dreamer/plugins/security";
 *
 * // 使用默认配置
 * const plugin = securityPlugin();
 *
 * // 自定义配置
 * const plugin = securityPlugin({
 *   csp: {
 *     defaultSrc: ["'self'"],
 *     scriptSrc: ["'self'", "'unsafe-inline'"],
 *     styleSrc: ["'self'", "'unsafe-inline'"],
 *   },
 *   hsts: {
 *     maxAge: 31536000,
 *     includeSubDomains: true,
 *     preload: true,
 *   },
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function securityPlugin(options: SecurityPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    csp,
    frameOptions = "SAMEORIGIN",
    contentTypeOptions = "nosniff",
    xssProtection = "1; mode=block",
    hsts = { maxAge: 31536000, includeSubDomains: true, preload: false },
    referrerPolicy = "strict-origin-when-cross-origin",
    permissionsPolicy,
    dnsPrefetchControl = "off",
    downloadOptions = "noopen",
    crossDomainPolicies = "none",
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-security",
    version: "1.0.0",

    // 插件配置
    config: {
      security: {
        csp,
        frameOptions,
        contentTypeOptions,
        xssProtection,
        hsts,
        referrerPolicy,
        permissionsPolicy,
        dnsPrefetchControl,
        downloadOptions,
        crossDomainPolicies,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.security && typeof config.security === "object") {
        const sec = config.security as Record<string, unknown>;
        // 验证 frameOptions
        if (
          sec.frameOptions !== undefined &&
          sec.frameOptions !== false &&
          !["DENY", "SAMEORIGIN"].includes(sec.frameOptions as string)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册安全服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册安全配置服务
      container.registerSingleton("securityConfig", () => ({
        csp,
        frameOptions,
        contentTypeOptions,
        xssProtection,
        hsts,
        referrerPolicy,
        permissionsPolicy,
        dnsPrefetchControl,
        downloadOptions,
        crossDomainPolicies,
        debug,
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info("安全头插件已初始化");
        }
      }
    },

    /**
     * 响应处理后钩子
     * 添加安全头到响应
     */
    onResponse(ctx: RequestContext, container: ServiceContainer) {
      // 检查是否有响应
      if (!ctx.response) return;

      // 创建新的响应头
      const headers = new Headers(ctx.response.headers);

      // Content-Security-Policy
      if (csp !== false && csp) {
        const cspValue = buildCspHeader(csp);
        if (cspValue) {
          headers.set("Content-Security-Policy", cspValue);
        }
      }

      // X-Frame-Options
      if (frameOptions !== false) {
        headers.set("X-Frame-Options", frameOptions);
      }

      // X-Content-Type-Options
      if (contentTypeOptions !== false) {
        headers.set("X-Content-Type-Options", contentTypeOptions);
      }

      // X-XSS-Protection
      if (xssProtection !== false) {
        headers.set("X-XSS-Protection", xssProtection);
      }

      // Strict-Transport-Security
      if (hsts !== false) {
        headers.set("Strict-Transport-Security", buildHstsHeader(hsts));
      }

      // Referrer-Policy
      if (referrerPolicy !== false) {
        headers.set("Referrer-Policy", referrerPolicy);
      }

      // Permissions-Policy
      if (permissionsPolicy !== false && permissionsPolicy) {
        headers.set(
          "Permissions-Policy",
          buildPermissionsPolicyHeader(permissionsPolicy),
        );
      }

      // X-DNS-Prefetch-Control
      if (dnsPrefetchControl !== false) {
        headers.set("X-DNS-Prefetch-Control", dnsPrefetchControl);
      }

      // X-Download-Options
      if (downloadOptions !== false) {
        headers.set("X-Download-Options", downloadOptions);
      }

      // X-Permitted-Cross-Domain-Policies
      if (crossDomainPolicies !== false) {
        headers.set("X-Permitted-Cross-Domain-Policies", crossDomainPolicies);
      }

      // 创建新的响应
      ctx.response = new Response(ctx.response.body, {
        status: ctx.response.status,
        statusText: ctx.response.statusText,
        headers,
      });

      // 调试日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(`安全头已添加: ${ctx.path}`);
        }
      }
    },
  };
}

// 导出默认创建函数
export default securityPlugin;
