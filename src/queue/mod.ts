/**
 * @module @dreamer/plugins/queue
 *
 * 队列插件：在 `onStart` 中创建 `@dreamer/queue` 的 `QueueManager` 并注册到服务容器，
 * 按配置创建队列及可选 `process` 订阅；在 `onStop` 中关闭管理器。日志与计划任务插件一致：
 * 第二参为与 `APP_CONFIG.logger` 同形的 `LoggerConfig`。
 */

import type { Plugin } from "@dreamer/plugin";
import type { Logger, LoggerConfig } from "@dreamer/logger";
import {
  createQueueManager,
  type JobData,
  type JobProcessor,
  type QueueManager,
  type QueueManagerOptions,
  type QueueOptions,
} from "@dreamer/queue";
import type { ServiceContainer } from "@dreamer/service";

import {
  buildPluginTaskLogger,
  type PluginTaskLogger,
} from "../internal/plugin-logger.ts";

/** 重新导出，便于 `queuePlugin(options, logger)` 第二参类型标注 */
export type { LoggerConfig } from "@dreamer/logger";

const PLUGIN_NAME = "@dreamer/plugins-queue";
const PLUGIN_VERSION = "1.0.0";

/** 日志 tag，写入 `@dreamer/logger` 的 `tags` */
const QUEUE_TAG = "@dreamer/plugins-queue";

/**
 * 单条队列定义：名称、可选 `QueueOptions`、可选任务处理器
 */
export interface QueuePluginQueueEntry<T extends JobData = JobData> {
  /** 队列名称（`QueueManager.createQueue`） */
  name: string;
  /** 传给 `createQueue` 的选项 */
  options?: Partial<QueueOptions>;
  /**
   * 任务处理器；提供时会在 `onStart` 中调用 `queue.process()` 开始消费
   */
  process?: JobProcessor<T>;
}

/**
 * `queuePlugin` 首参：队列管理器选项 + 要创建的队列列表
 */
export interface QueuePluginOptions {
  /**
   * 管理器名称：`default` 时注册为容器内 `queueManager`，否则 `queueManager:${name}`
   */
  managerName?: string;
  /**
   * 与 `QueueManager` / `createQueueManager` 一致，**必须**提供 `adapter`
   */
  manager: QueueManagerOptions;
  /**
   * 在 `onStart` 中依次 `createQueue`；若条目含 `process` 则订阅处理
   */
  queues?: QueuePluginQueueEntry[];
}

type QueuePluginRuntime = {
  options: QueuePluginOptions;
  logger?: LoggerConfig;
};

/**
 * 校验插件配置；非法时抛出带前缀的 `Error`
 */
function validateQueuePluginOptions(options: QueuePluginOptions): void {
  if (!options.manager || typeof options.manager !== "object") {
    throw new Error("queuePlugin: manager must be an object");
  }
  if (!options.manager.adapter) {
    throw new Error("queuePlugin: manager.adapter is required");
  }
  const queues = options.queues;
  if (queues === undefined) return;
  if (!Array.isArray(queues)) {
    throw new Error("queuePlugin: queues must be an array");
  }
  for (let i = 0; i < queues.length; i++) {
    const q = queues[i];
    if (!q || typeof q !== "object") {
      throw new Error(`queuePlugin: queues[${i}] must be an object`);
    }
    if (typeof q.name !== "string" || q.name.trim() === "") {
      throw new Error(
        `queuePlugin: queues[${i}].name must be a non-empty string`,
      );
    }
  }
}

/**
 * 包装业务 `JobProcessor`，在前后打队列插件日志
 */
function wrapJobProcessor(
  queueName: string,
  logger: PluginTaskLogger,
  processor: JobProcessor,
): JobProcessor {
  return async (job) => {
    logger.info("job start", {
      queue: queueName,
      id: job.id,
      name: job.name,
    });
    try {
      await processor(job);
      logger.info("job completed", { queue: queueName, id: job.id });
    } catch (error) {
      logger.error("job failed", error);
      throw error;
    }
  };
}

/**
 * 创建队列插件：在 `onStart` 挂载 `QueueManager`，在 `onStop` 中 `close()`。
 *
 * @param options 首参：`manager`（含 `adapter`）与可选 `queues` 定义
 * @param logger 可选；与 `APP_CONFIG.logger` 同形的 **`LoggerConfig`**（独立文件、轮转等在第二参配置）
 *
 * @example
 * ```ts
 * import { MemoryQueueAdapter } from "@dreamer/queue";
 * import { queuePlugin } from "@dreamer/plugins/queue";
 *
 * queuePlugin(
 *   {
 *     manager: { adapter: new MemoryQueueAdapter(), autoRecover: false },
 *     queues: [
 *       {
 *         name: "mail",
 *         options: { concurrency: 2 },
 *         process: async (job) => {
 *           console.log(job.data);
 *         },
 *       },
 *     ],
 *   },
 *   { level: "info", output: { file: { path: "./logs/queue.log" } } },
 * );
 * ```
 */
export function queuePlugin(
  options: QueuePluginOptions,
  logger?: LoggerConfig,
): Plugin {
  validateQueuePluginOptions(options);
  const runtime: QueuePluginRuntime = { options, logger };

  /** 当前插件创建的 `QueueManager`，在 `onStop` 中关闭 */
  let manager: QueueManager | null = null;
  /** 由 `buildPluginTaskLogger` 创建、需在 `onStop` 中 `close` 的 Logger */
  let dreamerToClose: Logger | null = null;

  const queueEntries = options.queues ?? [];

  return {
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,

    config: {
      queue: {
        managerName: options.managerName ?? "default",
        queueCount: queueEntries.length,
        hasLoggerConfig: Boolean(logger),
      },
    },

    /**
     * 应用启动后创建管理器、注册容器、创建队列并可选启动 `process`
     */
    onStart(container: ServiceContainer) {
      const built = buildPluginTaskLogger(
        container,
        runtime.logger,
        QUEUE_TAG,
      );
      dreamerToClose = built.dreamerToClose;
      const log = built.taskLogger;

      const mgrName = runtime.options.managerName ?? "default";
      manager = createQueueManager(
        { ...runtime.options.manager, name: mgrName },
        container,
      );

      for (const def of queueEntries) {
        const q = manager.createQueue(def.name, def.options ?? {});
        if (def.process) {
          q.process(wrapJobProcessor(def.name, log, def.process));
        }
      }

      /** 启动完成系诊断信息，用 debug 避免默认 info 刷屏 */
      log.debug?.("queue manager started", {
        managerName: mgrName,
        queueCount: queueEntries.length,
      });
    },

    /**
     * 先关闭队列管理器，再关闭插件专用 Logger
     */
    async onStop(_container: ServiceContainer) {
      if (manager) {
        try {
          await manager.close();
        } catch (e) {
          console.warn("queuePlugin onStop manager close error:", e);
        }
        manager = null;
      }
      if (dreamerToClose) {
        try {
          await dreamerToClose.close();
        } catch (e) {
          console.warn("queuePlugin onStop logger close error:", e);
        }
        dreamerToClose = null;
      }
    },
  };
}
