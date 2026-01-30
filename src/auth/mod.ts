/**
 * @module @dreamer/plugins/auth
 *
 * 用户认证插件
 *
 * 提供用户认证功能，支持：
 * - JWT 认证
 * - Session 认证
 * - Bearer Token 认证
 * - 基础认证（Basic Auth）
 * - 路由保护
 * - 角色权限控制
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 用户信息接口
 */
export interface AuthUser {
  /** 用户 ID */
  id: string | number;
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 角色列表 */
  roles?: string[];
  /** 权限列表 */
  permissions?: string[];
  /** 其他属性 */
  [key: string]: unknown;
}

/**
 * JWT 配置
 */
export interface JwtConfig {
  /** 密钥 */
  secret: string;
  /** 算法（默认 "HS256"） */
  algorithm?: "HS256" | "HS384" | "HS512";
  /** 过期时间（秒，默认 3600） */
  expiresIn?: number;
  /** 签发者 */
  issuer?: string;
  /** 受众 */
  audience?: string;
}

/**
 * 认证插件配置选项
 */
export interface AuthPluginOptions {
  /** 认证类型（默认 "jwt"） */
  type?: "jwt" | "session" | "bearer" | "basic";
  /** JWT 配置（当 type 为 "jwt" 时必需） */
  jwt?: JwtConfig;
  /** Session 配置（当 type 为 "session" 时使用） */
  session?: {
    /** Session 键名（默认 "user"） */
    key?: string;
  };
  /** Bearer Token 验证函数 */
  verifyToken?: (token: string) => Promise<AuthUser | null>;
  /** Basic Auth 验证函数 */
  verifyCredentials?: (
    username: string,
    password: string,
  ) => Promise<AuthUser | null>;
  /** 需要认证的路径（正则表达式或字符串数组） */
  protectedPaths?: string[] | RegExp[];
  /** 不需要认证的路径（正则表达式或字符串数组） */
  publicPaths?: string[] | RegExp[];
  /** 未认证时的状态码（默认 401） */
  unauthorizedStatus?: number;
  /** 未认证时的响应消息 */
  unauthorizedMessage?: string | Record<string, unknown>;
  /** 禁止访问时的状态码（默认 403） */
  forbiddenStatus?: number;
  /** 禁止访问时的响应消息 */
  forbiddenMessage?: string | Record<string, unknown>;
  /** 角色权限配置 */
  roles?: Record<string, string[]>; // 路径 -> 允许的角色
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 检查路径是否匹配
 * @param path - 请求路径
 * @param patterns - 匹配模式列表
 * @returns 是否匹配
 */
function matchPath(
  path: string | undefined,
  patterns: string[] | RegExp[],
): boolean {
  if (!path || patterns.length === 0) return false;

  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      if (path === pattern || path.startsWith(pattern)) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(path)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 解析 Bearer Token
 * @param authHeader - Authorization 头
 * @returns Token 或 null
 */
function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * 解析 Basic Auth
 * @param authHeader - Authorization 头
 * @returns 用户名和密码或 null
 */
function parseBasicAuth(
  authHeader: string | null,
): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  try {
    const base64 = authHeader.slice(6);
    const decoded = atob(base64);
    const colonIndex = decoded.indexOf(":");
    if (colonIndex === -1) return null;

    return {
      username: decoded.slice(0, colonIndex),
      password: decoded.slice(colonIndex + 1),
    };
  } catch {
    return null;
  }
}

/**
 * 简单的 JWT 解析（不验证签名，仅用于提取 payload）
 * 注意：生产环境应使用专业的 JWT 库进行签名验证
 * @param token - JWT Token
 * @returns 解析后的 payload 或 null
 */
function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Base64URL 解码
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * 检查 JWT 是否过期
 * @param payload - JWT payload
 * @returns 是否过期
 */
function isJwtExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp as number | undefined;
  if (!exp) return false;
  return Date.now() / 1000 > exp;
}

/**
 * 创建认证插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { authPlugin } from "@dreamer/plugins/auth";
 *
 * // JWT 认证
 * const plugin = authPlugin({
 *   type: "jwt",
 *   jwt: {
 *     secret: "your-secret-key",
 *     expiresIn: 3600,
 *   },
 *   protectedPaths: ["/api/"],
 *   publicPaths: ["/api/auth/login", "/api/auth/register"],
 * });
 *
 * // Bearer Token 认证
 * const plugin = authPlugin({
 *   type: "bearer",
 *   verifyToken: async (token) => {
 *     // 验证 token 并返回用户信息
 *     const user = await validateToken(token);
 *     return user;
 *   },
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function authPlugin(options: AuthPluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    type = "jwt",
    jwt,
    session = { key: "user" },
    verifyToken,
    verifyCredentials,
    protectedPaths = [],
    publicPaths = [],
    unauthorizedStatus = 401,
    unauthorizedMessage = "未授权访问",
    forbiddenStatus = 403,
    forbiddenMessage = "禁止访问",
    roles = {},
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-auth",
    version: "1.0.0",

    // 插件配置
    config: {
      auth: {
        type,
        protectedPaths,
        publicPaths,
        unauthorizedStatus,
        forbiddenStatus,
        roles,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.auth && typeof config.auth === "object") {
        const auth = config.auth as Record<string, unknown>;
        // 验证认证类型
        if (
          auth.type !== undefined &&
          !["jwt", "session", "bearer", "basic"].includes(auth.type as string)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册认证服务到容器
     */
    onInit(container: ServiceContainer) {
      // 注册认证配置服务
      container.registerSingleton("authConfig", () => ({
        type,
        jwt,
        session,
        protectedPaths,
        publicPaths,
        unauthorizedStatus,
        forbiddenStatus,
        roles,
        debug,
      }));

      // 注册认证服务
      container.registerSingleton("authService", () => ({
        /**
         * 获取当前用户
         * @param ctx - 请求上下文
         * @returns 用户信息或 null
         */
        getUser: (ctx: RequestContext): AuthUser | null => {
          return (ctx as Record<string, unknown>)._authUser as AuthUser | null;
        },
        /**
         * 检查用户是否有角色
         * @param user - 用户信息
         * @param role - 角色名
         * @returns 是否有角色
         */
        hasRole: (user: AuthUser | null, role: string): boolean => {
          if (!user || !user.roles) return false;
          return user.roles.includes(role);
        },
        /**
         * 检查用户是否有权限
         * @param user - 用户信息
         * @param permission - 权限名
         * @returns 是否有权限
         */
        hasPermission: (user: AuthUser | null, permission: string): boolean => {
          if (!user || !user.permissions) return false;
          return user.permissions.includes(permission);
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(`认证插件已初始化: type=${type}`);
        }
      }
    },

    /**
     * 请求处理钩子
     * 验证用户认证
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      const path = ctx.path || "";

      // 检查是否是公开路径
      if (matchPath(path, publicPaths)) {
        return;
      }

      // 检查是否需要认证
      const needsAuth = protectedPaths.length === 0 ||
        matchPath(path, protectedPaths);

      if (!needsAuth) {
        return;
      }

      // 获取 Authorization 头
      const authHeader = ctx.headers?.get("authorization") || null;
      let user: AuthUser | null = null;

      // 根据认证类型进行验证
      switch (type) {
        case "jwt": {
          const token = parseBearerToken(authHeader);
          if (token) {
            const payload = parseJwt(token);
            if (payload && !isJwtExpired(payload)) {
              // 简单验证：检查签发者和受众
              if (jwt?.issuer && payload.iss !== jwt.issuer) {
                break;
              }
              if (jwt?.audience && payload.aud !== jwt.audience) {
                break;
              }
              user = {
                id: payload.sub as string || payload.id as string || "",
                username: payload.username as string,
                email: payload.email as string,
                roles: payload.roles as string[],
                permissions: payload.permissions as string[],
                ...payload,
              };
            }
          }
          break;
        }

        case "bearer": {
          const token = parseBearerToken(authHeader);
          if (token && verifyToken) {
            user = await verifyToken(token);
          }
          break;
        }

        case "basic": {
          const credentials = parseBasicAuth(authHeader);
          if (credentials && verifyCredentials) {
            user = await verifyCredentials(
              credentials.username,
              credentials.password,
            );
          }
          break;
        }

        case "session": {
          // 从 session 获取用户信息
          const sessionKey = session?.key || "user";
          if (container.has("sessionService")) {
            const sessionService = container.get<{
              get: (key: string) => unknown;
            }>("sessionService");
            if (sessionService) {
              user = sessionService.get(sessionKey) as AuthUser | null;
            }
          }
          break;
        }
      }

      // 保存用户信息到上下文
      (ctx as Record<string, unknown>)._authUser = user;

      // 如果未认证，返回 401
      if (!user) {
        const body = typeof unauthorizedMessage === "string"
          ? JSON.stringify({ error: unauthorizedMessage })
          : JSON.stringify(unauthorizedMessage);

        const headers = new Headers({
          "Content-Type": "application/json",
        });

        // 对于 Basic Auth，添加 WWW-Authenticate 头
        if (type === "basic") {
          headers.set("WWW-Authenticate", 'Basic realm="Secure Area"');
        }

        ctx.response = new Response(body, {
          status: unauthorizedStatus,
          headers,
        });

        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(`认证失败: ${path} | type=${type}`);
          }
        }

        return;
      }

      // 检查角色权限
      const requiredRoles = roles[path];
      if (requiredRoles && requiredRoles.length > 0) {
        const userRoles = user.roles || [];
        const hasRequiredRole = requiredRoles.some((role) =>
          userRoles.includes(role)
        );

        if (!hasRequiredRole) {
          const body = typeof forbiddenMessage === "string"
            ? JSON.stringify({ error: forbiddenMessage })
            : JSON.stringify(forbiddenMessage);

          ctx.response = new Response(body, {
            status: forbiddenStatus,
            headers: { "Content-Type": "application/json" },
          });

          if (debug) {
            const logger = container.has("logger")
              ? container.get<{ info: (msg: string) => void }>("logger")
              : null;
            if (logger) {
              logger.info(
                `权限不足: ${path} | 需要角色=${
                  requiredRoles.join(",")
                } | 用户角色=${userRoles.join(",")}`,
              );
            }
          }

          return;
        }
      }

      // 调试日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(`认证成功: ${path} | user=${user.id}`);
        }
      }
    },
  };
}

// 导出默认创建函数
export default authPlugin;
