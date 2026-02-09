/**
 * UnoCSS 编译器测试
 *
 * 测试完成后自动清理 tests/data/unocss-test 下生成的测试文件
 */

import { exists, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";
import { UnoCompiler } from "../src/unocss/compiler.ts";

// 测试目录（测试完成后自动清空）
const TEST_DIR = "./tests/data/unocss-test";

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

// 创建测试文件
async function setupTestFiles(): Promise<void> {
  if (!(await exists(TEST_DIR))) {
    await mkdir(TEST_DIR, { recursive: true });
  }

  // 创建 CSS 入口文件
  const cssContent = `
/* UnoCSS 测试文件 */
@unocss preflights;
@unocss default;

/* 自定义样式 */
.custom-class {
  color: red;
}
`;

  await writeTextFile(`${TEST_DIR}/unocss.css`, cssContent);

  // 创建一个包含 UnoCSS 类的 TSX 文件
  const tsxContent = `
export function Button() {
  return <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Click me</button>;
}

export function Card() {
  return (
    <div class="shadow-lg p-6 rounded-xl border border-gray-200">
      <h2 class="text-xl font-bold mb-2">Card Title</h2>
      <p class="text-gray-600">Card content here</p>
    </div>
  );
}
`;
  await writeTextFile(`${TEST_DIR}/components.tsx`, tsxContent);
}

// 主测试
async function testUnoCompiler() {
  console.log("🧪 测试 UnoCSS 编译器...\n");

  try {
    // 测试前先清理可能存在的上次测试残留
    await cleanupTestOutput();
    // 设置测试文件
    await setupTestFiles();
    console.log("✅ 测试文件创建成功");

    // 创建编译器实例（指定 content 来扫描测试文件）
    const compiler = new UnoCompiler({
      cssEntry: `${TEST_DIR}/unocss.css`,
      content: [`${TEST_DIR}/**/*.tsx`],
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
      console.log("\n📄 CSS 预览 (前 1000 字符):");
      console.log("---");
      console.log(result.css.substring(0, 1000));
      console.log("---");

      // 检查是否包含预期的类
      const expectedClasses = [
        "bg-blue-500",
        "text-white",
        "px-4",
        "py-2",
        "rounded",
        "shadow-lg",
        "text-xl",
        "font-bold",
      ];

      const foundClasses: string[] = [];
      const missingClasses: string[] = [];

      for (const cls of expectedClasses) {
        if (result.css.includes(cls)) {
          foundClasses.push(cls);
        } else {
          missingClasses.push(cls);
        }
      }

      console.log(`\n✅ 找到的类: ${foundClasses.join(", ") || "无"}`);
      if (missingClasses.length > 0) {
        console.log(`⚠️ 未找到的类: ${missingClasses.join(", ")}`);
      }

      if (foundClasses.length > 0) {
        console.log("\n✅ UnoCSS 编译成功!");
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
await testUnoCompiler();
