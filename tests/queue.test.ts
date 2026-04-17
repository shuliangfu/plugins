/**
 * @fileoverview 队列插件（queuePlugin）单元测试
 *
 * 覆盖配置校验、容器注册、`process` 消费与 `onStop` 清理。
 */

import { MemoryQueueAdapter, QueueManager } from "@dreamer/queue";
import { ServiceContainer } from "@dreamer/service";
import { describe, expect, it } from "@dreamer/test";
import { queuePlugin, type QueuePluginOptions } from "../src/queue/mod.ts";

describe("队列插件（queue）", () => {
  describe("配置校验（queuePlugin 构造时）", () => {
    it("应拒绝缺少 adapter 的 manager", () => {
      expect(() =>
        queuePlugin({
          manager: {} as QueuePluginOptions["manager"],
        })
      ).toThrow("queuePlugin: manager.adapter is required");
    });

    it("应接受仅含 adapter 的 manager 与空 queues", () => {
      const adapter = new MemoryQueueAdapter();
      expect(() => queuePlugin({ manager: { adapter } })).not.toThrow();
    });

    it("应拒绝 queues 非数组", () => {
      const adapter = new MemoryQueueAdapter();
      expect(() =>
        queuePlugin({
          manager: { adapter },
          queues: {} as unknown as QueuePluginOptions["queues"],
        })
      ).toThrow("queuePlugin: queues must be an array");
    });

    it("应拒绝空队列名", () => {
      const adapter = new MemoryQueueAdapter();
      expect(() =>
        queuePlugin({
          manager: { adapter },
          queues: [{
            name: "  ",
            process: async () => await Promise.resolve(),
          }],
        })
      ).toThrow("queues[0].name must be a non-empty string");
    });
  });

  it("应注册 QueueManager 并由 process 消费任务", async () => {
    const adapter = new MemoryQueueAdapter();
    let processed = 0;
    const plugin = queuePlugin(
      {
        manager: { adapter, autoRecover: false },
        queues: [
          {
            name: "demo",
            process: async () => {
              await Promise.resolve();
              processed++;
            },
          },
        ],
      },
      { level: "info" },
    );

    const container = new ServiceContainer();
    plugin.onStart?.(container);

    const qm = QueueManager.fromContainer(container);
    const q = qm.getQueue("demo");
    expect(q).toBeDefined();

    await q!.add("ping", { n: 1 });
    await new Promise((r) => setTimeout(r, 400));
    expect(processed).toBe(1);

    await plugin.onStop?.(container);
  });

  it("自定义 managerName 时应以 queueManager:name 注册", async () => {
    const adapter = new MemoryQueueAdapter();
    const plugin = queuePlugin({
      managerName: "bg",
      manager: { adapter, autoRecover: false },
      queues: [{ name: "q1" }],
    });
    const container = new ServiceContainer();
    plugin.onStart?.(container);

    const qm = QueueManager.fromContainer(container, "bg");
    expect(qm.getQueue("q1")).toBeDefined();

    await plugin.onStop?.(container);
  });
});
