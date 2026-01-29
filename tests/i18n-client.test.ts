/**
 * i18n 客户端模块测试
 *
 * 测试 I18nClient 的所有功能
 */

import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import {
  $t,
  createI18nClient,
  getGlobalI18n,
  getI18nClient,
  I18nClient,
  installI18n,
  isI18nInstalled,
  uninstallI18n,
} from "../src/i18n/client/mod.ts";

describe("I18nClient 国际化客户端", () => {
  let client: I18nClient;

  // 测试用翻译数据
  const testTranslations = {
    "zh-CN": {
      greeting: "你好",
      greetingWithName: "你好，{name}！",
      nav: {
        home: "首页",
        about: "关于",
        contact: "联系我们",
      },
      count: "共 {count} 项",
    },
    "en-US": {
      greeting: "Hello",
      greetingWithName: "Hello, {name}!",
      nav: {
        home: "Home",
        about: "About",
        contact: "Contact",
      },
      count: "{count} items",
    },
  };

  // 每个测试前创建新实例
  beforeEach(() => {
    client = new I18nClient({
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "en-US", "ja-JP"],
      translations: testTranslations,
    });
  });

  // 每个测试后清理
  afterEach(() => {
    client.removeAllListeners();
  });

  describe("实例创建", () => {
    it("应该使用默认配置创建实例", () => {
      const c = new I18nClient();
      expect(c).toBeDefined();
      expect(c.locale).toBeDefined();
    });

    it("应该使用自定义配置创建实例", () => {
      const c = new I18nClient({
        defaultLocale: "en-US",
        locales: ["en-US", "zh-CN"],
        cookieName: "app-locale",
      });
      expect(c).toBeDefined();
    });

    it("createI18nClient 工厂函数应该返回 I18nClient 实例", () => {
      const c = createI18nClient();
      expect(c).toBeInstanceOf(I18nClient);
    });

    it("getI18nClient 应该返回单例实例", () => {
      const c1 = getI18nClient();
      const c2 = getI18nClient();
      expect(c1).toBe(c2);
    });
  });

  describe("语言获取与设置", () => {
    it("locale 应该返回当前语言", () => {
      expect(client.locale).toBe("zh-CN");
    });

    it("supportedLocales 应该返回支持的语言列表", () => {
      const locales = client.supportedLocales;
      expect(locales).toContain("zh-CN");
      expect(locales).toContain("en-US");
      expect(locales).toContain("ja-JP");
    });

    it("setLocale 应该切换语言", () => {
      const result = client.setLocale("en-US");
      expect(result).toBe(true);
      expect(client.locale).toBe("en-US");
    });

    it("setLocale 对不支持的语言应该返回 false", () => {
      const result = client.setLocale("fr-FR");
      expect(result).toBe(false);
      expect(client.locale).toBe("zh-CN");
    });

    it("setLocale 对相同语言应该返回 true", () => {
      const result = client.setLocale("zh-CN");
      expect(result).toBe(true);
    });
  });

  describe("翻译函数 t()", () => {
    it("应该返回简单翻译", () => {
      expect(client.t("greeting")).toBe("你好");
    });

    it("应该支持参数插值", () => {
      expect(client.t("greetingWithName", { name: "张三" })).toBe(
        "你好，张三！",
      );
    });

    it("应该支持嵌套键", () => {
      expect(client.t("nav.home")).toBe("首页");
      expect(client.t("nav.about")).toBe("关于");
    });

    it("切换语言后应该返回对应语言的翻译", () => {
      client.setLocale("en-US");
      expect(client.t("greeting")).toBe("Hello");
      expect(client.t("nav.home")).toBe("Home");
    });

    it("缺失翻译应该返回键名（默认行为）", () => {
      expect(client.t("nonexistent.key")).toBe("nonexistent.key");
    });

    it("数字参数应该被正确插值", () => {
      expect(client.t("count", { count: 5 })).toBe("共 5 项");
    });
  });

  describe("翻译存在检查 has()", () => {
    it("存在的键应该返回 true", () => {
      expect(client.has("greeting")).toBe(true);
      expect(client.has("nav.home")).toBe(true);
    });

    it("不存在的键应该返回 false", () => {
      expect(client.has("nonexistent")).toBe(false);
      expect(client.has("nav.nonexistent")).toBe(false);
    });
  });

  describe("动态添加翻译 addTranslations()", () => {
    it("应该添加新的翻译数据", () => {
      client.addTranslations("zh-CN", {
        newKey: "新的翻译",
      });
      expect(client.t("newKey")).toBe("新的翻译");
    });

    it("应该合并嵌套的翻译数据", () => {
      client.addTranslations("zh-CN", {
        nav: {
          settings: "设置",
        },
      });
      expect(client.t("nav.settings")).toBe("设置");
      expect(client.t("nav.home")).toBe("首页");
    });
  });

  describe("数字格式化 formatNumber()", () => {
    it("应该格式化数字", () => {
      expect(client.formatNumber(1234567.89)).toBe("1,234,567.89");
    });

    it("应该支持自定义小数位数", () => {
      expect(client.formatNumber(1234.5, { decimals: 0 })).toBe("1,235");
      expect(client.formatNumber(1234.5, { decimals: 3 })).toBe("1,234.500");
    });

    it("应该支持自定义分隔符", () => {
      expect(
        client.formatNumber(1234567.89, {
          thousandsSeparator: " ",
          decimalSeparator: ",",
        }),
      ).toBe("1 234 567,89");
    });
  });

  describe("货币格式化 formatCurrency()", () => {
    it("中文应该使用人民币符号", () => {
      expect(client.formatCurrency(1234.56)).toBe("¥1,234.56");
    });

    it("英文应该使用美元符号", () => {
      client.setLocale("en-US");
      expect(client.formatCurrency(1234.56)).toBe("$1,234.56");
    });

    it("应该支持自定义货币符号", () => {
      expect(client.formatCurrency(1234.56, "€")).toBe("€1,234.56");
    });
  });

  describe("日期格式化 formatDate()", () => {
    const testDate = new Date(2024, 0, 15, 14, 30, 45);

    it("应该格式化日期", () => {
      expect(client.formatDate(testDate, "date")).toBe("2024-01-15");
    });

    it("应该格式化时间", () => {
      expect(client.formatDate(testDate, "time")).toBe("14:30:45");
    });

    it("应该格式化日期时间", () => {
      expect(client.formatDate(testDate, "datetime")).toBe(
        "2024-01-15 14:30:45",
      );
    });

    it("应该支持时间戳输入", () => {
      expect(client.formatDate(testDate.getTime(), "date")).toBe("2024-01-15");
    });

    it("应该支持自定义格式", () => {
      expect(client.formatDate(testDate, "YYYY/MM/DD")).toBe("2024/01/15");
    });
  });

  describe("相对时间格式化 formatRelative()", () => {
    it("刚刚的时间应该返回'刚刚'", () => {
      const now = Date.now();
      expect(client.formatRelative(now)).toBe("刚刚");
    });

    it("分钟前的时间应该正确格式化", () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(client.formatRelative(fiveMinutesAgo)).toBe("5 分钟前");
    });

    it("小时前的时间应该正确格式化", () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(client.formatRelative(twoHoursAgo)).toBe("2 小时前");
    });

    it("天前的时间应该正确格式化", () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(client.formatRelative(threeDaysAgo)).toBe("3 天前");
    });

    it("英文应该使用英文格式", () => {
      client.setLocale("en-US");
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(client.formatRelative(fiveMinutesAgo)).toBe("5 minutes ago");
    });

    it("未来时间应该使用'后'", () => {
      const fiveMinutesLater = Date.now() + 5 * 60 * 1000;
      expect(client.formatRelative(fiveMinutesLater)).toBe("5 分钟后");
    });
  });

  describe("事件监听", () => {
    it("onChange 应该注册回调", () => {
      const callback = (_locale: string) => {};
      const unsubscribe = client.onChange(callback);
      expect(typeof unsubscribe).toBe("function");
    });

    it("切换语言时应该触发回调", () => {
      let newLocale = "";
      client.onChange((locale) => {
        newLocale = locale;
      });

      client.setLocale("en-US");
      expect(newLocale).toBe("en-US");
    });

    it("onChange 返回的函数应该能取消监听", () => {
      let callCount = 0;
      const unsubscribe = client.onChange(() => {
        callCount++;
      });

      client.setLocale("en-US");
      expect(callCount).toBe(1);

      unsubscribe();

      client.setLocale("zh-CN");
      expect(callCount).toBe(1);
    });

    it("removeAllListeners 应该移除所有监听器", () => {
      let callCount = 0;
      client.onChange(() => callCount++);
      client.onChange(() => callCount++);

      client.removeAllListeners();

      client.setLocale("en-US");
      expect(callCount).toBe(0);
    });
  });

  describe("全局 $t 方法", () => {
    // 获取类型安全的全局对象引用
    type I18nGlobal = {
      $t?: (key: string, params?: Record<string, string | number>) => string;
      $i18n?: I18nClient;
    };
    const g = globalThis as unknown as I18nGlobal;

    afterEach(() => {
      // 每个测试后卸载全局方法
      uninstallI18n();
    });

    it("installI18n 应该注册全局 $t 方法", () => {
      installI18n(client);
      expect(isI18nInstalled()).toBe(true);
      expect(typeof g.$t).toBe("function");
    });

    it("installI18n 应该注册全局 $i18n 实例", () => {
      installI18n(client);
      expect(g.$i18n).toBeDefined();
      expect(g.$i18n).toBe(client);
    });

    it("全局 $t 应该正确翻译", () => {
      installI18n(client);
      expect(g.$t!("greeting")).toBe("你好");
      expect(g.$t!("nav.home")).toBe("首页");
    });

    it("全局 $t 应该支持参数", () => {
      installI18n(client);
      expect(g.$t!("greetingWithName", { name: "张三" })).toBe(
        "你好，张三！",
      );
    });

    it("uninstallI18n 应该移除全局方法", () => {
      installI18n(client);
      expect(isI18nInstalled()).toBe(true);

      uninstallI18n();
      expect(isI18nInstalled()).toBe(false);
    });

    it("getGlobalI18n 应该返回全局实例", () => {
      installI18n(client);
      expect(getGlobalI18n()).toBe(client);
    });

    it("getGlobalI18n 在未安装时应该返回 undefined", () => {
      expect(getGlobalI18n()).toBeUndefined();
    });

    it("导出的 $t 函数应该可用", () => {
      installI18n(client);
      expect($t("greeting")).toBe("你好");
    });

    it("installI18n 不传参数应该使用默认实例", () => {
      const i18n = installI18n();
      expect(i18n).toBeDefined();
      expect(g.$i18n).toBe(i18n);
    });

    it("全局 $i18n 应该可以切换语言", () => {
      installI18n(client);
      g.$i18n!.setLocale("en-US");
      expect(g.$t!("greeting")).toBe("Hello");
    });
  });
});
