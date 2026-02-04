/**
 * @dreamer/plugins 模块导出测试
 *
 * 测试所有插件的导出是否正确
 */

import { describe, expect, it } from "@dreamer/test";
import {
  analyticsPlugin,
  type AnalyticsPluginOptions,
  i18nPlugin,
  type I18nPluginOptions,
  pwaPlugin,
  type PWAPluginOptions,
  seoPlugin,
  type SEOPluginOptions,
  tailwindPlugin,
  type TailwindPluginOptions,
  themePlugin,
  type ThemePluginOptions,
  unocssPlugin,
  type UnoCSSPluginOptions,
} from "../src/mod.ts";

describe("@dreamer/plugins 模块导出", () => {
  describe("插件函数导出", () => {
    it("应该导出 tailwindPlugin 函数", () => {
      expect(tailwindPlugin).toBeDefined();
      expect(typeof tailwindPlugin).toBe("function");
    });

    it("应该导出 unocssPlugin 函数", () => {
      expect(unocssPlugin).toBeDefined();
      expect(typeof unocssPlugin).toBe("function");
    });

    it("应该导出 i18nPlugin 函数", () => {
      expect(i18nPlugin).toBeDefined();
      expect(typeof i18nPlugin).toBe("function");
    });

    it("应该导出 seoPlugin 函数", () => {
      expect(seoPlugin).toBeDefined();
      expect(typeof seoPlugin).toBe("function");
    });

    it("应该导出 pwaPlugin 函数", () => {
      expect(pwaPlugin).toBeDefined();
      expect(typeof pwaPlugin).toBe("function");
    });

    it("应该导出 analyticsPlugin 函数", () => {
      expect(analyticsPlugin).toBeDefined();
      expect(typeof analyticsPlugin).toBe("function");
    });

    it("应该导出 themePlugin 函数", () => {
      expect(themePlugin).toBeDefined();
      expect(typeof themePlugin).toBe("function");
    });
  });

  const cssPluginOutput = "dist/client/assets";

  describe("插件实例化", () => {
    it("tailwindPlugin 应该返回有效的插件对象", () => {
      const plugin = tailwindPlugin({ output: cssPluginOutput });

      expect(plugin.name).toBe("@dreamer/plugins-tailwindcss");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });

    it("unocssPlugin 应该返回有效的插件对象", () => {
      const plugin = unocssPlugin({ output: cssPluginOutput });

      expect(plugin.name).toBe("@dreamer/plugins-unocss");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });

    it("i18nPlugin 应该返回有效的插件对象", () => {
      const plugin = i18nPlugin();

      expect(plugin.name).toBe("@dreamer/plugins-i18n");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });

    it("seoPlugin 应该返回有效的插件对象", () => {
      const plugin = seoPlugin();

      expect(plugin.name).toBe("@dreamer/plugins-seo");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });

    it("pwaPlugin 应该返回有效的插件对象", () => {
      const plugin = pwaPlugin();

      expect(plugin.name).toBe("@dreamer/plugins-pwa");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });

    it("analyticsPlugin 应该返回有效的插件对象", () => {
      const plugin = analyticsPlugin();

      expect(plugin.name).toBe("@dreamer/plugins-analytics");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });

    it("themePlugin 应该返回有效的插件对象", () => {
      const plugin = themePlugin();

      expect(plugin.name).toBe("@dreamer/plugins-theme");
      expect(plugin.version).toBeDefined();
      expect(plugin.config).toBeDefined();
    });
  });

  describe("插件接口", () => {
    it("所有插件应该有 validateConfig 方法", () => {
      expect(tailwindPlugin({ output: cssPluginOutput }).validateConfig)
        .toBeDefined();
      expect(unocssPlugin({ output: cssPluginOutput }).validateConfig)
        .toBeDefined();
      expect(i18nPlugin().validateConfig).toBeDefined();
      expect(seoPlugin().validateConfig).toBeDefined();
      expect(pwaPlugin().validateConfig).toBeDefined();
      expect(analyticsPlugin().validateConfig).toBeDefined();
      expect(themePlugin().validateConfig).toBeDefined();
    });

    it("所有插件应该有 onInit 钩子", () => {
      expect(tailwindPlugin({ output: cssPluginOutput }).onInit).toBeDefined();
      expect(unocssPlugin({ output: cssPluginOutput }).onInit).toBeDefined();
      expect(i18nPlugin().onInit).toBeDefined();
      expect(seoPlugin().onInit).toBeDefined();
      expect(pwaPlugin().onInit).toBeDefined();
      expect(analyticsPlugin().onInit).toBeDefined();
      expect(themePlugin().onInit).toBeDefined();
    });

    it("CSS 插件应该有 onRequest 和 onResponse 钩子", () => {
      const tailwind = tailwindPlugin({ output: cssPluginOutput });
      const unocss = unocssPlugin({ output: cssPluginOutput });

      expect(tailwind.onRequest).toBeDefined();
      expect(tailwind.onResponse).toBeDefined();
      expect(unocss.onRequest).toBeDefined();
      expect(unocss.onResponse).toBeDefined();
    });

    it("i18n 插件应该有 onRequest 和 onResponse 钩子", () => {
      const plugin = i18nPlugin();

      expect(plugin.onRequest).toBeDefined();
      expect(plugin.onResponse).toBeDefined();
    });

    it("SEO 插件应该有 onResponse 和 onBuildComplete 钩子", () => {
      const plugin = seoPlugin();

      expect(plugin.onResponse).toBeDefined();
      expect(plugin.onBuildComplete).toBeDefined();
    });

    it("PWA 插件应该有 onResponse 钩子", () => {
      const plugin = pwaPlugin();

      expect(plugin.onResponse).toBeDefined();
    });

    it("Analytics 插件应该有 onRequest 和 onResponse 钩子", () => {
      const plugin = analyticsPlugin();

      expect(plugin.onRequest).toBeDefined();
      expect(plugin.onResponse).toBeDefined();
    });

    it("Theme 插件应该有 onRequest 和 onResponse 钩子", () => {
      const plugin = themePlugin();

      expect(plugin.onRequest).toBeDefined();
      expect(plugin.onResponse).toBeDefined();
    });
  });

  describe("类型导出验证", () => {
    it("TailwindPluginOptions 类型应该可用", () => {
      const options: TailwindPluginOptions = {
        output: cssPluginOutput,
        content: ["./src/**/*.tsx"],
        jit: true,
      };

      const plugin = tailwindPlugin(options);
      const tailwindConfig = plugin.config?.tailwind as Record<string, unknown>;
      expect(tailwindConfig?.content).toEqual(["./src/**/*.tsx"]);
    });

    it("UnoCSSPluginOptions 类型应该可用", () => {
      const options: UnoCSSPluginOptions = {
        output: cssPluginOutput,
        presets: ["@unocss/preset-wind"],
        icons: true,
      };

      const plugin = unocssPlugin(options);
      const unocssConfig = plugin.config?.unocss as Record<string, unknown>;
      expect(unocssConfig?.icons).toBe(true);
    });

    it("I18nPluginOptions 类型应该可用", () => {
      const options: I18nPluginOptions = {
        defaultLocale: "en-US",
        locales: ["en-US", "zh-CN"],
      };

      const plugin = i18nPlugin(options);
      const i18nConfig = plugin.config?.i18n as Record<string, unknown>;
      expect(i18nConfig?.defaultLocale).toBe("en-US");
    });

    it("SEOPluginOptions 类型应该可用", () => {
      const options: SEOPluginOptions = {
        title: "Test",
        description: "Test description",
      };

      const plugin = seoPlugin(options);
      const seoConfig = plugin.config?.seo as Record<string, unknown>;
      expect(seoConfig?.title).toBe("Test");
    });

    it("PWAPluginOptions 类型应该可用", () => {
      const options: PWAPluginOptions = {
        name: "Test App",
        themeColor: "#000000",
      };

      const plugin = pwaPlugin(options);
      const pwaConfig = plugin.config?.pwa as Record<string, unknown>;
      expect(pwaConfig?.name).toBe("Test App");
    });

    it("AnalyticsPluginOptions 类型应该可用", () => {
      const options: AnalyticsPluginOptions = {
        ga4Id: "G-TEST",
        trackPageviews: true,
      };

      const plugin = analyticsPlugin(options);
      const analyticsConfig = plugin.config?.analytics as Record<
        string,
        unknown
      >;
      expect(analyticsConfig?.ga4Id).toBe("G-TEST");
    });

    it("ThemePluginOptions 类型应该可用", () => {
      const options: ThemePluginOptions = {
        defaultMode: "dark",
        strategy: "class",
      };

      const plugin = themePlugin(options);
      const themeConfig = plugin.config?.theme as Record<string, unknown>;
      expect(themeConfig?.defaultMode).toBe("dark");
    });
  });
});

describe("子模块导出", () => {
  it("应该能从 tailwindcss 子模块导入", async () => {
    const mod = await import("../src/tailwindcss/mod.ts");

    expect(mod.tailwindPlugin).toBeDefined();
    expect(mod.TailwindCompiler).toBeDefined();
  });

  it("应该能从 unocss 子模块导入", async () => {
    const mod = await import("../src/unocss/mod.ts");

    expect(mod.unocssPlugin).toBeDefined();
    expect(mod.UnoCompiler).toBeDefined();
  });

  it("应该能从 i18n 子模块导入", async () => {
    const mod = await import("../src/i18n/mod.ts");

    expect(mod.i18nPlugin).toBeDefined();
  });

  it("应该能从 seo 子模块导入", async () => {
    const mod = await import("../src/seo/mod.ts");

    expect(mod.seoPlugin).toBeDefined();
  });

  it("应该能从 pwa 子模块导入", async () => {
    const mod = await import("../src/pwa/mod.ts");

    expect(mod.pwaPlugin).toBeDefined();
  });

  it("应该能从 analytics 子模块导入", async () => {
    const mod = await import("../src/analytics/mod.ts");

    expect(mod.analyticsPlugin).toBeDefined();
  });

  it("应该能从 theme 子模块导入", async () => {
    const mod = await import("../src/theme/mod.ts");

    expect(mod.themePlugin).toBeDefined();
    expect(mod.createTheme).toBeDefined();
    expect(mod.THEME_CHANGE_EVENT).toBeDefined();
  });
});
