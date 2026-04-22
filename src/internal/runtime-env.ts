/**
 * 与 @dreamer/dweb App 约定一致的环境判断（仅依赖 `RUNTIME_ENV`，不再读取 `DENO_ENV`）。
 *
 * @module
 */

import { getEnv } from "@dreamer/runtime-adapter";

/**
 * 是否为开发运行时进程（`RUNTIME_ENV=dev`）。
 *
 * `build` / `start` 或未设置时返回 false，与 dweb 中各特性模块对 `RUNTIME_ENV` 的用法对齐。
 *
 * @returns 仅当 `RUNTIME_ENV` 显式为 `dev` 时为 true
 */
export function isRuntimeEnvDev(): boolean {
  return getEnv("RUNTIME_ENV") === "dev";
}
