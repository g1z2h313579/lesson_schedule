import { applyD1Migrations, type D1Migration, env } from "cloudflare:test";

// 每个测试文件运行前，把迁移应用到测试用 D1（已应用的会自动跳过）
const testEnv = env as Env & { TEST_MIGRATIONS: D1Migration[] };
await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
