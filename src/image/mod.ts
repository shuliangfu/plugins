/**
 * @module @dreamer/plugins/image
 *
 * 图片处理插件
 *
 * 提供图片处理功能，支持：
 * - 图片压缩
 * - 格式转换
 * - 尺寸调整
 * - 懒加载支持
 * - 响应式图片
 *
 * 注意：此插件使用 @dreamer/image 库进行实际的图片处理
 *
 * 设计原则：
 * - 插件只响应事件钩子（onInit、onRequest、onResponse 等）
 * - 生命周期由 PluginManager 统一管理
 */

import type { Plugin, RequestContext } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import { ensureDir, stat, readFile, writeFile } from "@dreamer/runtime-adapter";
import {
  createImageProcessor,
  type ImageProcessor,
  type ResizeOptions,
} from "@dreamer/image";

/**
 * 图片尺寸配置
 */
export interface ImageSize {
  /** 宽度 */
  width: number;
  /** 高度（可选，保持比例时可省略） */
  height?: number;
  /** 名称后缀（如 "sm", "md", "lg"） */
  suffix: string;
}

/**
 * 图片处理插件配置选项
 */
export interface ImagePluginOptions {
  /** 图片处理 URL 前缀（默认 "/_image"） */
  routePrefix?: string;
  /** 原始图片目录（默认 "./public/images"） */
  sourceDir?: string;
  /** 处理后图片缓存目录（默认 "./.cache/images"） */
  cacheDir?: string;
  /** 默认图片质量（1-100，默认 80） */
  quality?: number;
  /** 默认输出格式（默认 "webp"） */
  format?: "jpeg" | "png" | "webp" | "avif";
  /** 预设尺寸列表 */
  sizes?: ImageSize[];
  /** 是否启用懒加载脚本注入（默认 true） */
  lazyLoad?: boolean;
  /** 懒加载占位符颜色（默认 "#f0f0f0"） */
  placeholderColor?: string;
  /** 是否启用缓存（默认 true） */
  cache?: boolean;
  /** 缓存有效期（秒，默认 86400 * 30 = 30 天） */
  cacheMaxAge?: number;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 图片处理参数
 */
export interface ImageProcessParams {
  /** 源图片路径 */
  src: string;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 质量 */
  quality?: number;
  /** 格式 */
  format?: "jpeg" | "png" | "webp" | "avif";
  /** 裁剪模式 */
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

/**
 * 默认预设尺寸
 */
const DEFAULT_SIZES: ImageSize[] = [
  { width: 320, suffix: "sm" },
  { width: 640, suffix: "md" },
  { width: 1024, suffix: "lg" },
  { width: 1920, suffix: "xl" },
];

/**
 * 解析图片处理参数
 * @param url - 请求 URL
 * @param prefix - 路由前缀
 * @returns 图片处理参数
 */
function parseImageParams(
  url: URL,
  prefix: string,
): ImageProcessParams | null {
  const path = url.pathname;

  // 检查前缀
  if (!path.startsWith(prefix)) {
    return null;
  }

  // 获取图片路径
  const src = path.slice(prefix.length);
  if (!src) {
    return null;
  }

  // 解析查询参数
  const params: ImageProcessParams = { src };

  const width = url.searchParams.get("w") || url.searchParams.get("width");
  if (width) {
    params.width = parseInt(width, 10);
  }

  const height = url.searchParams.get("h") || url.searchParams.get("height");
  if (height) {
    params.height = parseInt(height, 10);
  }

  const quality = url.searchParams.get("q") || url.searchParams.get("quality");
  if (quality) {
    params.quality = parseInt(quality, 10);
  }

  const format = url.searchParams.get("f") || url.searchParams.get("format");
  if (
    format && ["jpeg", "png", "webp", "avif"].includes(format.toLowerCase())
  ) {
    params.format = format.toLowerCase() as "jpeg" | "png" | "webp" | "avif";
  }

  const fit = url.searchParams.get("fit");
  if (
    fit && ["cover", "contain", "fill", "inside", "outside"].includes(fit)
  ) {
    params.fit = fit as "cover" | "contain" | "fill" | "inside" | "outside";
  }

  return params;
}

/**
 * 获取缓存键
 * @param params - 图片处理参数
 * @returns 缓存键
 */
function getCacheKey(params: ImageProcessParams): string {
  const parts = [params.src];

  if (params.width) parts.push(`w${params.width}`);
  if (params.height) parts.push(`h${params.height}`);
  if (params.quality) parts.push(`q${params.quality}`);
  if (params.format) parts.push(params.format);
  if (params.fit) parts.push(params.fit);

  return parts.join("_").replace(/[\/\\]/g, "_");
}

/**
 * 获取 MIME 类型
 * @param format - 图片格式
 * @returns MIME 类型
 */
function getMimeType(format: string): string {
  switch (format) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

/**
 * 创建图片处理插件
 *
 * @param options - 插件配置选项
 * @returns 插件对象
 *
 * @example
 * ```typescript
 * import { imagePlugin } from "@dreamer/plugins/image";
 *
 * // 基础用法
 * const plugin = imagePlugin({
 *   sourceDir: "./public/images",
 *   quality: 80,
 *   format: "webp",
 * });
 *
 * // 自定义尺寸
 * const plugin = imagePlugin({
 *   sizes: [
 *     { width: 400, suffix: "thumb" },
 *     { width: 800, suffix: "medium" },
 *     { width: 1600, suffix: "large" },
 *   ],
 * });
 *
 * await pluginManager.use(plugin);
 * ```
 */
export function imagePlugin(options: ImagePluginOptions = {}): Plugin {
  // 解构配置选项，设置默认值
  const {
    routePrefix = "/_image",
    sourceDir = "./public/images",
    cacheDir = "./.cache/images",
    quality = 80,
    format = "webp",
    sizes = DEFAULT_SIZES,
    lazyLoad = true,
    placeholderColor = "#f0f0f0",
    cache = true,
    cacheMaxAge = 86400 * 30,
    debug = false,
  } = options;

  return {
    name: "@dreamer/plugins-image",
    version: "1.0.0",

    // 插件配置
    config: {
      image: {
        routePrefix,
        sourceDir,
        cacheDir,
        quality,
        format,
        sizes,
        lazyLoad,
        placeholderColor,
        cache,
        cacheMaxAge,
        debug,
      },
    },

    /**
     * 配置验证
     */
    validateConfig: (config) => {
      if (config.image && typeof config.image === "object") {
        const img = config.image as Record<string, unknown>;
        // 验证 quality
        if (
          img.quality !== undefined &&
          (typeof img.quality !== "number" || img.quality < 1 ||
            img.quality > 100)
        ) {
          return false;
        }
      }
      return true;
    },

    /**
     * 初始化钩子
     * 注册图片处理服务到容器
     */
    async onInit(container: ServiceContainer) {
      // 确保缓存目录存在（使用 runtime-adapter 的 ensureDir）
      // ensureDir 会自动处理：目录不存在则创建，存在则不做操作
      if (cache) {
        await ensureDir(cacheDir);
      }

      // 创建图片处理器（使用 @dreamer/image 库）
      let imageProcessor: ImageProcessor | null = null;
      try {
        imageProcessor = await createImageProcessor();
      } catch (error) {
        // 如果 ImageMagick 未安装，输出警告但不阻止插件初始化
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `图片处理器初始化警告: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }

      // 注册图片处理器到容器
      container.registerSingleton("imageProcessor", () => imageProcessor);

      // 注册图片配置服务
      container.registerSingleton("imageConfig", () => ({
        routePrefix,
        sourceDir,
        cacheDir,
        quality,
        format,
        sizes,
        lazyLoad,
        placeholderColor,
        cache,
        cacheMaxAge,
        debug,
      }));

      // 注册图片处理服务
      container.registerSingleton("imageService", () => ({
        /**
         * 获取图片 URL
         * @param src - 源图片路径
         * @param params - 处理参数
         * @returns 处理后的 URL
         */
        getUrl: (
          src: string,
          params?: Partial<ImageProcessParams>,
        ): string => {
          let url = `${routePrefix}${src}`;
          const queryParams: string[] = [];

          if (params?.width) queryParams.push(`w=${params.width}`);
          if (params?.height) queryParams.push(`h=${params.height}`);
          if (params?.quality) queryParams.push(`q=${params.quality}`);
          if (params?.format) queryParams.push(`f=${params.format}`);
          if (params?.fit) queryParams.push(`fit=${params.fit}`);

          if (queryParams.length > 0) {
            url += "?" + queryParams.join("&");
          }

          return url;
        },
        /**
         * 生成响应式图片 srcset
         * @param src - 源图片路径
         * @returns srcset 字符串
         */
        getSrcSet: (src: string): string => {
          return sizes
            .map((size) => {
              const url = `${routePrefix}${src}?w=${size.width}&f=${format}`;
              return `${url} ${size.width}w`;
            })
            .join(", ");
        },
        /**
         * 生成懒加载图片 HTML
         * @param src - 源图片路径
         * @param alt - 替代文本
         * @param params - 处理参数
         * @returns HTML 字符串
         */
        getLazyHtml: (
          src: string,
          alt: string,
          params?: Partial<ImageProcessParams>,
        ): string => {
          const url = `${routePrefix}${src}`;
          const queryParams: string[] = [];

          if (params?.width) queryParams.push(`w=${params.width}`);
          if (params?.quality) queryParams.push(`q=${params.quality}`);
          if (params?.format || format) {
            queryParams.push(`f=${params?.format || format}`);
          }

          const fullUrl = queryParams.length > 0
            ? `${url}?${queryParams.join("&")}`
            : url;

          return `<img 
            data-src="${fullUrl}" 
            alt="${alt}" 
            class="lazy" 
            style="background-color: ${placeholderColor};"
            loading="lazy"
          >`;
        },
      }));

      // 输出日志
      if (debug) {
        const logger = container.has("logger")
          ? container.get<{ info: (msg: string) => void }>("logger")
          : null;
        if (logger) {
          logger.info(
            `图片处理插件已初始化: sourceDir=${sourceDir}, format=${format}`,
          );
        }
      }
    },

    /**
     * 请求处理钩子
     * 处理图片请求
     */
    async onRequest(ctx: RequestContext, container: ServiceContainer) {
      // 只处理 GET 请求
      if (ctx.method !== "GET") {
        return;
      }

      const path = ctx.path || "";

      // 检查路径前缀
      if (!path.startsWith(routePrefix)) {
        return;
      }

      // 解析图片参数
      const params = parseImageParams(ctx.url, routePrefix);
      if (!params) {
        return;
      }

      // 构建源文件路径
      const sourcePath = sourceDir + params.src;

      try {
        // 检查源文件是否存在（使用 runtime-adapter 的 stat）
        await stat(sourcePath);

        // 计算缓存键
        const cacheKey = getCacheKey({
          ...params,
          quality: params.quality || quality,
          format: params.format || format,
        });
        const cachePath = `${cacheDir}/${cacheKey}.${params.format || format}`;

        let imageData: Uint8Array;
        let fromCache = false;

        // 检查缓存（使用 runtime-adapter 的 readFile）
        if (cache) {
          try {
            imageData = await readFile(cachePath);
            fromCache = true;
          } catch {
            // 缓存不存在，需要处理图片
          }
        }

        // 如果没有缓存，处理图片
        if (!imageData!) {
          // 读取原始图片（使用 runtime-adapter 的 readFile）
          const sourceData = await readFile(sourcePath);

          // 获取图片处理器
          const processor = container.get<ImageProcessor | null>("imageProcessor");

          if (processor) {
            // 使用 @dreamer/image 库进行图片处理
            const targetFormat = (params.format || format) as
              | "jpeg"
              | "png"
              | "webp"
              | "gif"
              | "bmp"
              | "tiff"
              | "avif";

            // 判断是否需要调整尺寸
            if (params.width || params.height) {
              // 构建缩放选项
              const resizeOptions: ResizeOptions = {
                width: params.width,
                height: params.height,
                quality: params.quality || quality,
                fit: params.fit,
              };

              // 先调整尺寸，再转换格式
              const resized = await processor.resize(sourceData, resizeOptions);
              imageData = await processor.convert(resized, {
                format: targetFormat,
                quality: params.quality || quality,
              });
            } else {
              // 只进行格式转换和压缩
              imageData = await processor.compress(sourceData, {
                format: targetFormat,
                quality: params.quality || quality,
              });
            }
          } else {
            // 如果处理器不可用，返回原始图片
            imageData = sourceData;
          }

          // 如果启用缓存，保存到缓存（使用 runtime-adapter 的 writeFile）
          if (cache) {
            try {
              await writeFile(cachePath, imageData);
            } catch (error) {
              if (debug) {
                const logger = container.has("logger")
                  ? container.get<{ info: (msg: string) => void }>("logger")
                  : null;
                if (logger) {
                  logger.info(
                    `图片缓存写入失败: ${cachePath} | ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  );
                }
              }
            }
          }
        }

        // 确定 MIME 类型
        const outputFormat = params.format || format ||
          params.src.split(".").pop() || "jpeg";
        const mimeType = getMimeType(outputFormat);

        // 构建响应头
        const headers = new Headers();
        headers.set("Content-Type", mimeType);
        headers.set("Content-Length", imageData.length.toString());

        if (cache) {
          headers.set("Cache-Control", `public, max-age=${cacheMaxAge}`);
        }

        // 返回图片
        ctx.response = new Response(imageData.buffer as ArrayBuffer, {
          status: 200,
          headers,
        });

        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `图片处理: ${params.src} | ${imageData.length} bytes | cache=${fromCache}`,
            );
          }
        }
      } catch (error) {
        // 文件不存在或处理失败
        if (debug) {
          const logger = container.has("logger")
            ? container.get<{ info: (msg: string) => void }>("logger")
            : null;
          if (logger) {
            logger.info(
              `图片处理失败: ${sourcePath} | ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        ctx.response = new Response("Not Found", { status: 404 });
      }
    },

    /**
     * 响应处理后钩子
     * 注入懒加载脚本
     */
    async onResponse(ctx: RequestContext, _container: ServiceContainer) {
      // 只在 HTML 响应中注入懒加载脚本
      if (!lazyLoad || !ctx.response) {
        return;
      }

      const contentType = ctx.response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        return;
      }

      try {
        const html = await ctx.response.text();

        // 懒加载脚本
        const lazyScript = `
<script>
(function() {
  if ('loading' in HTMLImageElement.prototype) {
    // 浏览器原生支持懒加载
    document.querySelectorAll('img.lazy').forEach(function(img) {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  } else {
    // 使用 IntersectionObserver 降级方案
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        }
      });
    });
    document.querySelectorAll('img.lazy').forEach(function(img) {
      observer.observe(img);
    });
  }
})();
</script>`;

        // 注入到 </body> 前
        const injectedHtml = html.replace("</body>", lazyScript + "\n</body>");

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
export default imagePlugin;
