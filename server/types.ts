import type { Database } from "./db/client";
import type { Notifier } from "./services/notifier";

// Hono 应用的环境类型：Bindings 为 Cloudflare 绑定，Variables 为请求内共享的变量
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    notifier: Notifier;
  };
};
