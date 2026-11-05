import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { notificationChannel } from "../durable-objects/notification-hub";
import { ApiError } from "../lib/errors";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import type { AppEnv } from "../types";

// 不是 WebSocket 请求时直接拒绝，不必检查登录、唤醒 Durable Object
const requireWebSocket = createMiddleware(async (c, next) => {
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    throw new ApiError(426, "VALIDATION_ERROR", "需要使用 WebSocket 连接");
  }
  await next();
});

// 实时通知：检查登录后，把 WebSocket 连接转给这个用户的通知中心（Durable Object）
// 数据有变化时，通知中心通过这个连接告诉画面重新加载（见 services/notifier.ts）
export const realtimeRoutes = new Hono<AppEnv>()
  .use(requireWebSocket, requireAuth, loadCurrentUser, requireRegistered)
  .get("/", async (c) => {
    const hub = c.env.NOTIFICATION_HUB.getByName(notificationChannel(c.get("currentUser").id));
    const res = await hub.fetch(c.req.raw);
    // Durable Object 返回的响应头不能修改，而全局中间件还要添加响应头，所以复制一份
    return new Response(null, {
      status: res.status,
      webSocket: res.webSocket,
      headers: res.headers,
    });
  });
