import { app } from "./app";
import { runScheduledJobs } from "./jobs";

// Durable Object 的类必须从入口导出
export { NotificationHub } from "./durable-objects/notification-hub";

// Cloudflare Worker 入口
export default {
  // HTTP 请求（/api/*）交给 Hono 处理
  fetch: app.fetch,

  // 定时任务（Cron Triggers）
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledJobs(controller, env));
  },
} satisfies ExportedHandler<Env>;
