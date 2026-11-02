import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const rootDir = import.meta.dirname;

// 后端测试：在本地 Workers 运行时（workerd）中执行，带独立的本地 D1
export default defineConfig(async () => {
  // 读取迁移文件，测试开始前在 setup 中应用到测试用数据库
  const migrations = await readD1Migrations(path.resolve(rootDir, "drizzle/migrations"));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // 测试时覆盖的环境变量
          bindings: {
            APP_ENV: "test",
            AUTH_MOCK: "true",
            TEST_MIGRATIONS: migrations,
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@shared": path.resolve(rootDir, "shared"),
        "@server": path.resolve(rootDir, "server"),
      },
    },
    test: {
      // 后端测试，以及前后端共用代码（shared/）的单元测试
      include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
      setupFiles: ["./server/test/setup.ts"],
    },
  };
});
