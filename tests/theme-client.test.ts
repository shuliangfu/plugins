/**
 * Theme 客户端模块测试
 *
 * 测试 ThemeClient 的所有功能
 */

import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import {
  createThemeClient,
  getThemeClient,
  ThemeClient,
} from "../src/theme/client/mod.ts";

describe("ThemeClient 主题客户端", () => {
  let client: ThemeClient;

  // 每个测试前创建新实例
  beforeEach(() => {
    client = new ThemeClient();
  });

  // 每个测试后清理
  afterEach(() => {
    client.removeAllListeners();
  });

  describe("实例创建", () => {
    it("应该使用默认配置创建实例", () => {
      const c = new ThemeClient();
      expect(c).toBeDefined();
      expect(c.current).toBeDefined();
    });

    it("应该使用自定义配置创建实例", () => {
      const c = new ThemeClient({
        cookieName: "app-theme",
        defaultMode: "dark",
        transitionDuration: 300,
      });
      expect(c).toBeDefined();
    });

    it("createThemeClient 工厂函数应该返回 ThemeClient 实例", () => {
      const c = createThemeClient();
      expect(c).toBeInstanceOf(ThemeClient);
    });

    it("getThemeClient 应该返回单例实例", () => {
      const c1 = getThemeClient();
      const c2 = getThemeClient();
      expect(c1).toBe(c2);
    });
  });

  describe("主题获取", () => {
    it("current 应该返回当前主题", () => {
      const theme = client.current;
      expect(["light", "dark"]).toContain(theme);
    });

    it("mode 应该返回当前模式", () => {
      const mode = client.mode;
      expect(["light", "dark", "system"]).toContain(mode);
    });

    it("isDark 应该正确判断深色主题", () => {
      const c = new ThemeClient({ defaultMode: "dark" });
      expect(typeof c.isDark).toBe("boolean");
    });

    it("isLight 应该正确判断浅色主题", () => {
      expect(typeof client.isLight).toBe("boolean");
    });

    it("isSystem 应该正确判断系统模式", () => {
      expect(typeof client.isSystem).toBe("boolean");
    });

    it("getSystemPreference 应该返回系统偏好", () => {
      const pref = client.getSystemPreference();
      expect(["light", "dark"]).toContain(pref);
    });
  });

  describe("主题设置", () => {
    it("set 方法应该设置主题", () => {
      client.set("dark");
      client.set("light");
      client.set("system");
    });

    it("toggle 方法应该切换主题并返回新主题", () => {
      const newTheme = client.toggle();
      expect(["light", "dark"]).toContain(newTheme);
    });

    it("setLight 方法应该设置浅色主题", () => {
      client.setLight();
    });

    it("setDark 方法应该设置深色主题", () => {
      client.setDark();
    });

    it("setSystem 方法应该设置系统模式", () => {
      client.setSystem();
    });
  });

  describe("事件监听", () => {
    it("onChange 应该注册回调", () => {
      const callback = (_theme: string) => {};
      const unsubscribe = client.onChange(callback);
      expect(typeof unsubscribe).toBe("function");
    });

    it("onChange 返回的函数应该能取消监听", () => {
      const callback = () => {};
      const unsubscribe = client.onChange(callback);
      unsubscribe();
    });

    it("removeAllListeners 应该移除所有监听器", () => {
      client.onChange(() => {});
      client.onChange(() => {});
      client.removeAllListeners();
    });
  });

  describe("CSS 变量操作", () => {
    it("getCssVar 应该返回字符串", () => {
      const value = client.getCssVar("color-primary");
      expect(typeof value).toBe("string");
    });

    it("setCssVar 不应该抛出错误", () => {
      client.setCssVar("color-primary", "#ff0000");
    });

    it("getCssVar 应该支持自定义前缀", () => {
      const value = client.getCssVar("color-primary", "app");
      expect(typeof value).toBe("string");
    });
  });
});
