/**
 * TailwindCSS 编译器测试
 *
 * 测试完成后自动清理 tests/data/tailwindcss-test 下生成的测试文件
 */

import { exists, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";
import { TailwindCompiler } from "../src/tailwindcss/compiler.ts";

// 测试目录（测试完成后自动清空）
const TEST_DIR = "./tests/data/tailwindcss-test";

/**
 * 清理测试生成的目录和文件
 */
async function cleanupTestOutput(): Promise<void> {
  try {
    if (await exists(TEST_DIR)) {
      await remove(TEST_DIR, { recursive: true });
    }
  } catch {
    // 忽略清理失败
  }
}

// 创建测试 CSS 文件
async function setupTestFiles(): Promise<void> {
  if (!(await exists(TEST_DIR))) {
    await mkdir(TEST_DIR, { recursive: true });
  }

  // 创建包含 @source 指令的 CSS 文件
  const cssContent = `
/* TailwindCSS v4 测试文件 */
@import "tailwindcss";

/* 自定义样式 */
.custom-class {
  color: red;
}
`;

  await writeTextFile(`${TEST_DIR}/tailwind.css`, cssContent);

  // 创建一个包含 Tailwind 类的 TSX 文件
  const tsxContent = `
export function Button() {
  return <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Click me</button>;
}
`;
  await writeTextFile(`${TEST_DIR}/Button.tsx`, tsxContent);
}

// 主测试
async function testTailwindCompiler() {
  console.log("🧪 测试 TailwindCSS 编译器...\n");

  try {
    // 测试前先清理可能存在的上次测试残留
    await cleanupTestOutput();
    // 设置测试文件
    await setupTestFiles();
    console.log("✅ 测试文件创建成功");

    // 创建编译器实例
    const compiler = new TailwindCompiler({
      cssEntry: `${TEST_DIR}/tailwind.css`,
      dev: true,
    });

    console.log("✅ 编译器实例创建成功");

    // 执行编译
    console.log("⏳ 开始编译...");
    const result = await compiler.compile();

    console.log("\n📦 编译结果:");
    console.log(`  - CSS 长度: ${result.css.length} 字符`);
    console.log(`  - 需要重新编译: ${result.needsRebuild}`);
    console.log(`  - Hash: ${result.hash || "无"}`);
    console.log(`  - 文件名: ${result.filename || "无"}`);

    if (result.css.length > 0) {
      console.log("\n📄 CSS 预览 (前 500 字符):");
      console.log("---");
      console.log(result.css.substring(0, 500));
      console.log("---");

      // 检查是否包含编译后的 CSS（不是原始 @import）
      if (result.css.includes("@import") || result.css.includes("@tailwind")) {
        console.log("\n⚠️ 警告: CSS 可能未完全编译（仍包含指令）");
      } else {
        console.log("\n✅ CSS 编译成功!");
      }
    } else {
      console.log("\n❌ 编译失败: CSS 为空");
    }
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
  } finally {
    // 测试完成后自动清理测试输出
    await cleanupTestOutput();
  }
}

// 运行测试（必须 await 确保 finally 中的清理能执行）
await testTailwindCompiler();
