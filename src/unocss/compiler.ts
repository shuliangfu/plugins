/**
 * @module @dreamer/plugins/unocss/compiler
 *
 * UnoCSS 编译器
 *
 * 负责编译 UnoCSS 样式，使用 @unocss/core
 */

import {
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
   * 初始化 UnoCSS 生成器
   */
  private async initGenerator(): Promise<void> {
    if (this.generator) return;

    try {
      // 动态导入 @unocss/core 和预设
      const { createGenerator } = await import("@unocss/core");
      const { presetWind } = await import("@unocss/preset-wind");

      // 创建预设数组
      // deno-lint-ignore no-explicit-any
      const presets: any[] = [];

      // 添加 Wind 预设（TailwindCSS 兼容）
      if (
        this.options.presets?.includes("@unocss/preset-wind") ||
        this.options.presets?.length === 0 ||
        !this.options.presets
      ) {
        presets.push(presetWind());
      }

      // 如果启用图标系统，添加图标预设
      if (this.options.icons) {
        try {
          const { presetIcons } = await import("@unocss/preset-icons");
          presets.push(presetIcons({
            scale: 1.2,
            cdn: "https://esm.sh/",
          }));
        } catch {
          console.warn("[UnoCSS] 图标预设加载失败，跳过图标支持");
        }
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

      // 扫描内容文件，提取类名
      const classes = await this.scanContent();

      // 生成 CSS
      const genResult = await this.generator.generate(classes, {
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

      // 生成带 hash 的文件名
      const filename = `unocss.${hash}.css`;

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
   * 扫描内容文件，提取类名
   *
   * @returns 类名集合
   */
  private async scanContent(): Promise<Set<string>> {
    const classes = new Set<string>();

    // 如果没有指定 content，返回空集合
    if (!this.options.content || this.options.content.length === 0) {
      return classes;
    }

    const workDir = cwd();

    for (const pattern of this.options.content) {
      // 简单的 glob 处理（支持 **/*.{ts,tsx}）
      const files = await this.globFiles(workDir, pattern);

      for (const file of files) {
        try {
          const content = await readTextFile(file);
          // 提取类名（支持 class="..." 和 className="..."）
          const classMatches = content.matchAll(
            /(?:class|className)\s*=\s*["'`]([^"'`]+)["'`]/g,
          );
          for (const match of classMatches) {
            // 分割类名并添加到集合
            const classNames = match[1].split(/\s+/);
            for (const className of classNames) {
              if (className.trim()) {
                classes.add(className.trim());
              }
            }
          }
        } catch {
          // 忽略读取失败的文件
        }
      }
    }

    return classes;
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
