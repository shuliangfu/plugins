/**
 * @module @dreamer/plugins/auth
 *
 * 用户认证插件
 *
 * 基于 @dreamer/auth 库，提供插件级别的用户认证功能：
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
 * - 核心认证功能由 @dreamer/auth 库提供
 */

import {
  type AuthOptions,
  // 类型
  type AuthUser,
  extractUserFromJwt,
  getRequiredRoles,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  // 角色权限检查
  hasRole,
  isJwtExpired,
  type JwtConfig,
  type JwtPayload,
  parseBasicAuth,
  // Token 解析
  parseBearerToken,
  parseJwt,
  // 路径匹配
  requiresAuth,
  validateJwtClaims,
} from "@dreamer/auth";
import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

// 从 @dreamer/auth 重新导出类型和工具函数
export type {
  AuthOptions,
  AuthUser,
  JwtConfig,
  JwtPayload,
} from "@dreamer/auth";

export {
  // Session 认证
  AuthSessionManager,
  createAuthSession,
  createBasicAuthHeader,
  createBearerAuthHeader,
  createGitHubClient,
  createGoogleClient,
  createOAuth2Client,
  createTokenManager,
  decodeToken,
  DingTalkProvider,
  extractUserFromJwt,
  generatePKCE,
  generateState,
  getRequiredRoles,
  getTokenExpiration,
  getTokenRemainingTime,
  GiteeProvider,
  // 内置 Provider
  GitHubProvider,
  GitLabProvider,
  GoogleProvider,
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  // 角色权限检查
  hasRole,
  isJwtExpired,
  isTokenExpired,
  // 路径匹配
  matchPath,
  MemoryTokenStore,
  // OAuth2
  OAuth2Client,
  parseBasicAuth,
  // Token 解析
  parseBearerToken,
  parseGiteeUser,
  // 用户信息解析器
  parseGitHubUser,
  parseGitLabUser,
  parseGoogleUser,
  parseJwt,
  parseWeChatUser,
  requiresAuth,
  // JWT 签名验证（基于 @dreamer/crypto）
  signToken,
  // 刷新 Token
  TokenManager,
  validateJwtClaims,
  verifyToken,
  WeChatProvider,
  WeComProvider,
} from "@dreamer/auth";

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
    verifyToken: customVerifyToken,
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

  // 认证选项（用于 @dreamer/auth 的辅助函数）
  const authOptions: AuthOptions = {
    type,
    jwt,
    protectedPaths,
    publicPaths,
    roles,
  };

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

      // 注册认证服务（使用 @dreamer/auth 的函数）
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
         * 检查用户是否有角色（使用 @dreamer/auth 的 hasRole）
         * @param user - 用户信息
         * @param role - 角色名
         * @returns 是否有角色
         */
        hasRole: (user: AuthUser | null, role: string): boolean => {
          return hasRole(user, role);
        },

        /**
         * 检查用户是否有任意角色
         * @param user - 用户信息
         * @param roles - 角色列表
         * @returns 是否有任意角色
         */
        hasAnyRole: (user: AuthUser | null, roleList: string[]): boolean => {
          return hasAnyRole(user, roleList);
        },

        /**
         * 检查用户是否有权限（使用 @dreamer/auth 的 hasPermission）
         * @param user - 用户信息
         * @param permission - 权限名
         * @returns 是否有权限
         */
        hasPermission: (user: AuthUser | null, permission: string): boolean => {
          return hasPermission(user, permission);
        },

        /**
         * 检查用户是否有任意权限
         * @param user - 用户信息
         * @param permissions - 权限列表
         * @returns 是否有任意权限
         */
        hasAnyPermission: (
          user: AuthUser | null,
          permissionList: string[],
        ): boolean => {
          return hasAnyPermission(user, permissionList);
        },

        /**
         * 解析 JWT Token
         * @param token - JWT Token
         * @returns Payload 或 null
         */
        parseJwt: (token: string): JwtPayload | null => {
          return parseJwt(token);
        },

        /**
         * 从 JWT 提取用户信息
         * @param payload - JWT Payload
         * @returns 用户信息或 null
         */
        extractUser: (payload: JwtPayload | null): AuthUser | null => {
          return extractUserFromJwt(payload);
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

      // 使用 @dreamer/auth 的 requiresAuth 检查是否需要认证
      if (!requiresAuth(path, authOptions)) {
        return;
      }

      // 获取 Authorization 头
      const authHeader = ctx.headers?.get("authorization") || null;
      let user: AuthUser | null = null;

      // 根据认证类型进行验证（使用 @dreamer/auth 的函数）
      switch (type) {
        case "jwt": {
          // 使用 @dreamer/auth 的 parseBearerToken 和 parseJwt
          const token = parseBearerToken(authHeader);
          if (token) {
            const payload = parseJwt(token);
            // 使用 @dreamer/auth 的 validateJwtClaims 验证
            if (jwt) {
              const validation = validateJwtClaims(payload, jwt);
              if (validation.valid) {
                // 使用 @dreamer/auth 的 extractUserFromJwt
                user = extractUserFromJwt(payload);
              }
            } else if (payload && !isJwtExpired(payload)) {
              user = extractUserFromJwt(payload);
            }
          }
          break;
        }

        case "bearer": {
          // 使用 @dreamer/auth 的 parseBearerToken
          const token = parseBearerToken(authHeader);
          if (token && customVerifyToken) {
            user = await customVerifyToken(token);
          }
          break;
        }

        case "basic": {
          // 使用 @dreamer/auth 的 parseBasicAuth
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

      // 使用 @dreamer/auth 的 getRequiredRoles 检查角色权限
      const requiredRoles = getRequiredRoles(path, roles);
      if (requiredRoles.length > 0) {
        // 使用 @dreamer/auth 的 hasAnyRole
        if (!hasAnyRole(user, requiredRoles)) {
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
                } | 用户角色=${(user.roles || []).join(",")}`,
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
