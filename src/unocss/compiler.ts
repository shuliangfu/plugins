/**
 * @module @dreamer/plugins/unocss/compiler
 *
 * UnoCSS 编译器
 *
 * 负责编译 UnoCSS 样式，使用 @unocss/core
 */

import { createGenerator } from "@unocss/core";
import { presetIcons } from "@unocss/preset-icons";
import { presetWind3 } from "@unocss/preset-wind3";
import {
  basename,
  cwd,
  exists,
  join,
  readdir,
  readTextFile,
} from "@dreamer/runtime-adapter";

/**
 * UnoCSS 编译选项
 */
export interface UnoCompileOptions {
  /** CSS 入口文件路径 */
  cssEntry: string;
  /** 内容扫描路径（可选，默认扫描 ./src 目录） */
  content?: string[];
  /** 配置文件路径（可选） */
  config?: string;
  /** 是否为开发模式 */
  dev?: boolean;
  /** 预设列表 */
  presets?: string[];
  /** 是否启用图标系统 */
  icons?: boolean;
  /** 图标预设 */
  iconPresets?: string[];
  /** 自定义规则 */
  rules?: Array<[string, unknown]>;
  /** 自定义快捷方式 */
  shortcuts?: Record<string, string>;
  /** 自定义主题 */
  theme?: Record<string, unknown>;
}

/**
 * CSS 编译结果
 */
export interface CSSCompileResult {
  /** 编译后的 CSS 内容 */
  css: string;
  /** 是否需要重新编译（用于开发模式热重载） */
  needsRebuild?: boolean;
  /** 生成的文件名（不含路径，如 unocss.abc123.css） */
  filename?: string;
  /** 内容 hash（用于缓存失效） */
  hash?: string;
}

/**
 * UnoCSS 编译器类
 *
 * 负责将 UnoCSS 源文件编译为最终的 CSS 输出
 */
export class UnoCompiler {
  /** 编译配置选项 */
  private options: UnoCompileOptions;
  /** 编译结果缓存 */
  private cachedResult: CSSCompileResult | null = null;
  /** UnoCSS 生成器 */
  // deno-lint-ignore no-explicit-any
  private generator: any = null;

  /**
   * 创建 UnoCSS 编译器实例
   *
   * @param options - 编译配置选项
   */
  constructor(options: UnoCompileOptions) {
    this.options = options;
  }

  /**
   * 初始化 UnoCSS 生成器（使用静态导入的 @unocss/core 与预设）
   */
  private async initGenerator(): Promise<void> {
    if (this.generator) return;

    try {
      // 创建预设数组
      // deno-lint-ignore no-explicit-any
      const presets: any[] = [];

      // 添加 Wind3 预设（TailwindCSS/Windi 兼容，presetWind 已弃用）
      if (
        this.options.presets?.includes("@unocss/preset-wind3") ||
        this.options.presets?.includes("@unocss/preset-wind") ||
        this.options.presets?.length === 0 ||
        !this.options.presets
      ) {
        presets.push(presetWind3());
      }

      // 如果启用图标系统，添加图标预设
      if (this.options.icons) {
        presets.push(presetIcons({
          scale: 1.2,
          cdn: "https://esm.sh/",
        }));
      }

      // 创建 UnoCSS 生成器
      this.generator = await createGenerator({
        presets,
        shortcuts: this.options.shortcuts || {},
        theme: this.options.theme || {},
        // @ts-ignore - 规则类型复杂
        rules: this.options.rules || [],
      });
    } catch (error) {
      console.error("[UnoCSS] 初始化生成器失败:", error);
      throw error;
    }
  }

  /**
   * 编译 UnoCSS
   *
   * @returns 编译后的 CSS 结果
   */
  async compile(): Promise<CSSCompileResult> {
    const { cssEntry } = this.options;

    // 检查入口文件是否存在（可选，UnoCSS 不强制要求入口文件）
    if (cssEntry && !(await exists(cssEntry))) {
      console.warn(`[UnoCSS] CSS 入口文件不存在: ${cssEntry}`);
    }

    // 如果有缓存且非开发模式，直接返回缓存
    if (this.cachedResult && !this.options.dev) {
      return this.cachedResult;
    }

    return await this.compileUnoCSS();
  }

  /**
   * 获取最后一次编译的结果
   * 用于构建系统获取 hash 文件名
   *
   * @returns 最后一次编译结果，如果没有编译过则返回 null
   */
  getLastResult(): CSSCompileResult | null {
    return this.cachedResult;
  }

  /**
   * 编译 UnoCSS 样式
   *
   * @returns 编译结果
   */
  private async compileUnoCSS(): Promise<CSSCompileResult> {
    const dev = this.options.dev ?? false;

    try {
      // 初始化生成器
      await this.initGenerator();

      if (!this.generator) {
        throw new Error("UnoCSS 生成器未初始化");
      }

      // 读取内容文件，拼接后交给 UnoCSS 内置 extractor 提取（extractorSplit 会 tokenize 源码）
      const content = await this.readContent();

      // 生成 CSS（UnoCSS 使用内置 extractor 从原始源码提取类名）
      const genResult = await this.generator.generate(content, {
        preflights: true,
      });

      // 读取额外的自定义 CSS（如果存在入口文件）
      let customCSS = "";
      if (this.options.cssEntry && await exists(this.options.cssEntry)) {
        const rawCSS = await readTextFile(this.options.cssEntry);
        // 移除 UnoCSS 指令，只保留自定义样式
        customCSS = rawCSS
          .replace(/@unocss\s+\w+;?/g, "")
          .trim();
      }

      // 合并生成的 CSS 和自定义 CSS
      const css = customCSS
        ? `${genResult.css}\n\n/* 自定义样式 */\n${customCSS}`
        : genResult.css;

      // 生成内容 hash（用于缓存失效）
      const hash = await this.generateHash(css);

      // 生成带 hash 的文件名（基于入口文件名）
      // 例如：src/assets/unocss.css -> unocss.a1b2c3.css
      // 例如：src/assets/main.css -> main.a1b2c3.css
      const entryBasename = basename(this.options.cssEntry, ".css");
      const filename = `${entryBasename}.${hash}.css`;

      const result: CSSCompileResult = {
        css,
        needsRebuild: dev, // 开发模式需要热重载
        hash,
        filename,
      };

      // 缓存结果（非开发模式）
      if (!dev) {
        this.cachedResult = result;
      }

      return result;
    } catch (error) {
      console.error("[UnoCSS] 编译失败:", error);
      return { css: "" };
    }
  }

  /**
   * 生成内容 hash
   *
   * @param content - 内容字符串
   * @returns 8 位 hash 字符串
   */
  private async generateHash(content: string): Promise<string> {
    // 使用 Web Crypto API 生成 SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    // 返回前 8 位
    return hashHex.substring(0, 8);
  }

  /**
   * 读取 content 配置的文件内容并拼接
   * 将原始源码传给 UnoCSS generator.generate()，由其内置 extractorSplit 提取类名
   *
   * @returns 拼接后的文件内容
   */
  private async readContent(): Promise<string> {
    const parts: string[] = [];

    if (!this.options.content || this.options.content.length === 0) {
      return "";
    }

    const workDir = cwd();

    for (const pattern of this.options.content) {
      const files = await this.globFiles(workDir, pattern);

      for (const file of files) {
        try {
          const content = await readTextFile(file);
          parts.push(content);
        } catch {
          // 忽略读取失败的文件
        }
      }
    }

    return parts.join("\n\n");
  }

  /**
   * 简单的 glob 文件匹配
   *
   * @param baseDir - 基础目录
   * @param pattern - glob 模式
   * @returns 匹配的文件列表
   */
  private async globFiles(baseDir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];

    // 简化的 glob 处理
    // 实际生产环境应该使用更完善的 glob 库
    try {
      // 移除 ** 前缀
      const cleanPattern = pattern.replace(/^\.\/*\*+\//g, "");
      // 提取扩展名
      const extMatch = cleanPattern.match(/\.\{([^}]+)\}$/);
      const extensions = extMatch
        ? extMatch[1].split(",").map((e) => `.${e.trim()}`)
        : [".ts", ".tsx", ".js", ".jsx"];

      // 递归扫描目录
      await this.scanDir(baseDir, extensions, files);
    } catch {
      // 忽略扫描错误
    }

    return files;
  }

  /**
   * 递归扫描目录
   *
   * @param dir - 目录路径
   * @param extensions - 扩展名列表
   * @param result - 结果数组
   */
  private async scanDir(
    dir: string,
    extensions: string[],
    result: string[],
  ): Promise<void> {
    try {
      // 使用 runtime-adapter 的 readdir
      const entries = await readdir(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory) {
          // 跳过 node_modules 和 .git
          if (entry.name !== "node_modules" && entry.name !== ".git") {
            await this.scanDir(fullPath, extensions, result);
          }
        } else if (entry.isFile) {
          // 检查扩展名
          if (extensions.some((ext) => entry.name.endsWith(ext))) {
            result.push(fullPath);
          }
        }
      }
    } catch {
      // 忽略目录访问错误
    }
  }

  /**
   * 清除编译缓存
   */
  clearCache(): void {
    this.cachedResult = null;
  }
}
