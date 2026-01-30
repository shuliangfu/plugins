/**
 * 认证插件测试
 *
 * 测试认证插件的所有功能
 */

import { ServiceContainer } from "@dreamer/service";
import { beforeEach, describe, expect, it } from "@dreamer/test";
import {
  authPlugin,
  type AuthPluginOptions,
  type AuthUser,
} from "../src/auth/mod.ts";

describe("认证插件", () => {
  let container: ServiceContainer;

  // 每个测试前重置容器
  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe("插件创建", () => {
    it("应该使用默认配置创建插件", () => {
      const plugin = authPlugin();
      const config = plugin.config?.auth as Record<string, unknown>;

      expect(plugin.name).toBe("@dreamer/plugins-auth");
      expect(plugin.version).toBe("1.0.0");
      expect(config?.type).toBe("jwt");
      expect(config?.unauthorizedStatus).toBe(401);
      expect(config?.forbiddenStatus).toBe(403);
    });

    it("应该使用自定义配置创建插件", () => {
      const options: AuthPluginOptions = {
        type: "bearer",
        protectedPaths: ["/api/"],
        publicPaths: ["/api/auth/"],
        unauthorizedStatus: 403,
        roles: {
          "/api/admin": ["admin"],
        },
      };

      const plugin = authPlugin(options);
      const config = plugin.config?.auth as Record<string, unknown>;

      expect(config?.type).toBe("bearer");
      expect(config?.protectedPaths).toEqual(["/api/"]);
      expect(config?.publicPaths).toEqual(["/api/auth/"]);
    });
  });

  describe("配置验证", () => {
    it("应该验证有效配置", () => {
      const plugin = authPlugin();

      expect(plugin.validateConfig?.({ auth: { type: "jwt" } })).toBe(true);
      expect(plugin.validateConfig?.({ auth: { type: "bearer" } })).toBe(true);
      expect(plugin.validateConfig?.({ auth: { type: "basic" } })).toBe(true);
      expect(plugin.validateConfig?.({ auth: { type: "session" } })).toBe(true);
    });

    it("应该拒绝无效的认证类型", () => {
      const plugin = authPlugin();

      expect(plugin.validateConfig?.({ auth: { type: "invalid" } })).toBe(
        false,
      );
    });

    it("应该接受空配置", () => {
      const plugin = authPlugin();

      expect(plugin.validateConfig?.({})).toBe(true);
    });
  });

  describe("onInit 钩子", () => {
    it("应该注册 authConfig 服务", () => {
      const plugin = authPlugin({ type: "bearer" });

      plugin.onInit?.(container);

      const config = container.get("authConfig");
      expect(config).toBeDefined();
      expect((config as { type: string }).type).toBe("bearer");
    });

    it("应该注册 authService 服务", () => {
      const plugin = authPlugin();

      plugin.onInit?.(container);

      const service = container.get("authService");
      expect(service).toBeDefined();
    });

    it("authService 应该提供正确的方法", () => {
      const plugin = authPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        getUser: (ctx: unknown) => AuthUser | null;
        hasRole: (user: AuthUser | null, role: string) => boolean;
        hasPermission: (user: AuthUser | null, permission: string) => boolean;
      }>("authService");

      expect(service?.getUser).toBeDefined();
      expect(service?.hasRole).toBeDefined();
      expect(service?.hasPermission).toBeDefined();
    });

    it("hasRole 应该正确检查角色", () => {
      const plugin = authPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        hasRole: (user: AuthUser | null, role: string) => boolean;
      }>("authService");

      const user: AuthUser = {
        id: "1",
        roles: ["admin", "user"],
      };

      expect(service?.hasRole(user, "admin")).toBe(true);
      expect(service?.hasRole(user, "guest")).toBe(false);
      expect(service?.hasRole(null, "admin")).toBe(false);
    });

    it("hasPermission 应该正确检查权限", () => {
      const plugin = authPlugin();
      plugin.onInit?.(container);

      const service = container.get<{
        hasPermission: (user: AuthUser | null, permission: string) => boolean;
      }>("authService");

      const user: AuthUser = {
        id: "1",
        permissions: ["read", "write"],
      };

      expect(service?.hasPermission(user, "read")).toBe(true);
      expect(service?.hasPermission(user, "delete")).toBe(false);
      expect(service?.hasPermission(null, "read")).toBe(false);
    });
  });

  describe("onRequest 钩子 - 公开路径", () => {
    it("应该跳过公开路径", async () => {
      const plugin = authPlugin({
        protectedPaths: ["/api/"],
        publicPaths: ["/api/auth/login", "/api/auth/register"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/auth/login"),
        path: "/api/auth/login",
        method: "POST",
        url: new URL("http://localhost/api/auth/login"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 公开路径不需要认证，不应该设置响应
      expect(ctx.response).toBeUndefined();
    });

    it("应该跳过不在保护路径中的路径", async () => {
      const plugin = authPlugin({
        protectedPaths: ["/api/"],
        publicPaths: [],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/"),
        path: "/",
        method: "GET",
        url: new URL("http://localhost/"),
        headers: new Headers(),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 不在保护路径中，不需要认证
      expect(ctx.response).toBeUndefined();
    });
  });

  describe("onRequest 钩子 - JWT 认证", () => {
    // 创建一个简单的 JWT（不含签名验证）
    function createTestJwt(payload: Record<string, unknown>): string {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payloadBase64 = btoa(JSON.stringify(payload));
      const signature = "test-signature";
      return `${header}.${payloadBase64}.${signature}`;
    }

    it("应该拒绝没有 token 的请求", async () => {
      const plugin = authPlugin({
        type: "jwt",
        protectedPaths: ["/api/"],
      });
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

      expect(ctx.response?.status).toBe(401);
    });

    it("应该拒绝过期的 token", async () => {
      const expiredToken = createTestJwt({
        sub: "user-1",
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 小时前过期
      });

      const plugin = authPlugin({
        type: "jwt",
        protectedPaths: ["/api/"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: `Bearer ${expiredToken}`,
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      expect(ctx.response?.status).toBe(401);
    });

    it("应该接受有效的 JWT", async () => {
      const validToken = createTestJwt({
        sub: "user-1",
        username: "testuser",
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 小时后过期
      });

      const plugin = authPlugin({
        type: "jwt",
        protectedPaths: ["/api/"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: `Bearer ${validToken}`,
        }),
        response: undefined as Response | undefined,
        _authUser: undefined as AuthUser | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 有效的 token，不应该设置错误响应
      expect(ctx.response).toBeUndefined();
      expect(ctx._authUser).toBeDefined();
      expect(ctx._authUser?.id).toBe("user-1");
    });

    it("应该验证 JWT 签发者", async () => {
      const token = createTestJwt({
        sub: "user-1",
        iss: "wrong-issuer",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const plugin = authPlugin({
        type: "jwt",
        jwt: {
          secret: "test-secret",
          issuer: "my-app",
        },
        protectedPaths: ["/api/"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: `Bearer ${token}`,
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      // 签发者不匹配，应该拒绝
      expect(ctx.response?.status).toBe(401);
    });
  });

  describe("onRequest 钩子 - Bearer Token 认证", () => {
    it("应该使用自定义验证函数", async () => {
      const plugin = authPlugin({
        type: "bearer",
        verifyToken: (token) => {
          if (token === "valid-token") {
            return Promise.resolve({ id: "user-1", username: "testuser" });
          }
          return Promise.resolve(null);
        },
        protectedPaths: ["/api/"],
      });
      plugin.onInit?.(container);

      // 有效 token
      const ctx1 = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: "Bearer valid-token",
        }),
        response: undefined as Response | undefined,
        _authUser: undefined as AuthUser | undefined,
      };

      await plugin.onRequest?.(ctx1, container);
      expect(ctx1.response).toBeUndefined();
      expect(ctx1._authUser?.id).toBe("user-1");

      // 无效 token
      const ctx2 = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: "Bearer invalid-token",
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx2, container);
      expect(ctx2.response?.status).toBe(401);
    });
  });

  describe("onRequest 钩子 - Basic 认证", () => {
    it("应该验证基础认证", async () => {
      const plugin = authPlugin({
        type: "basic",
        verifyCredentials: (username, password) => {
          if (username === "admin" && password === "secret") {
            return Promise.resolve({ id: "admin-1", username: "admin" });
          }
          return Promise.resolve(null);
        },
        protectedPaths: ["/api/"],
      });
      plugin.onInit?.(container);

      // 有效凭证
      const credentials = btoa("admin:secret");
      const ctx1 = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: `Basic ${credentials}`,
        }),
        response: undefined as Response | undefined,
        _authUser: undefined as AuthUser | undefined,
      };

      await plugin.onRequest?.(ctx1, container);
      expect(ctx1.response).toBeUndefined();
      expect(ctx1._authUser?.username).toBe("admin");

      // 无效凭证
      const wrongCredentials = btoa("admin:wrong");
      const ctx2 = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: `Basic ${wrongCredentials}`,
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx2, container);
      expect(ctx2.response?.status).toBe(401);
      expect(ctx2.response?.headers.get("WWW-Authenticate")).toContain("Basic");
    });
  });

  describe("onRequest 钩子 - 角色权限", () => {
    function createTestJwt(payload: Record<string, unknown>): string {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payloadBase64 = btoa(JSON.stringify(payload));
      const signature = "test-signature";
      return `${header}.${payloadBase64}.${signature}`;
    }

    it("应该检查角色权限", async () => {
      const plugin = authPlugin({
        type: "jwt",
        protectedPaths: ["/api/"],
        roles: {
          "/api/admin": ["admin"],
        },
      });
      plugin.onInit?.(container);

      // 没有 admin 角色的用户
      const userToken = createTestJwt({
        sub: "user-1",
        roles: ["user"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const ctx1 = {
        request: new Request("http://localhost/api/admin"),
        path: "/api/admin",
        method: "GET",
        url: new URL("http://localhost/api/admin"),
        headers: new Headers({
          Authorization: `Bearer ${userToken}`,
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx1, container);
      expect(ctx1.response?.status).toBe(403);

      // 有 admin 角色的用户
      const adminToken = createTestJwt({
        sub: "admin-1",
        roles: ["admin"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const ctx2 = {
        request: new Request("http://localhost/api/admin"),
        path: "/api/admin",
        method: "GET",
        url: new URL("http://localhost/api/admin"),
        headers: new Headers({
          Authorization: `Bearer ${adminToken}`,
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx2, container);
      expect(ctx2.response).toBeUndefined();
    });
  });

  describe("getUser 方法", () => {
    it("应该从上下文获取用户", async () => {
      function createTestJwt(payload: Record<string, unknown>): string {
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const payloadBase64 = btoa(JSON.stringify(payload));
        const signature = "test-signature";
        return `${header}.${payloadBase64}.${signature}`;
      }

      const token = createTestJwt({
        sub: "user-1",
        username: "testuser",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const plugin = authPlugin({
        type: "jwt",
        protectedPaths: ["/api/"],
      });
      plugin.onInit?.(container);

      const ctx = {
        request: new Request("http://localhost/api/users"),
        path: "/api/users",
        method: "GET",
        url: new URL("http://localhost/api/users"),
        headers: new Headers({
          Authorization: `Bearer ${token}`,
        }),
        response: undefined as Response | undefined,
      };

      await plugin.onRequest?.(ctx, container);

      const service = container.get<{
        getUser: (ctx: unknown) => AuthUser | null;
      }>("authService");

      const user = service?.getUser(ctx);
      expect(user).toBeDefined();
      expect(user?.id).toBe("user-1");
    });
  });
});
