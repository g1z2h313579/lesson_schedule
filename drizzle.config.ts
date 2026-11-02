import { defineConfig } from "drizzle-kit";

// drizzle-kit 只用来根据 schema 生成迁移 SQL，迁移的执行交给 wrangler
export default defineConfig({
  dialect: "sqlite",
  schema: "./server/db/schema/index.ts",
  out: "./drizzle/migrations",
  // 代码中用驼峰命名，数据库列名自动转为下划线命名
  casing: "snake_case",
});
