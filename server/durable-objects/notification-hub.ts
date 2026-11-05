import { DurableObject } from "cloudflare:workers";
import {
  REALTIME_PING,
  REALTIME_PONG,
  REALTIME_PROTOCOL,
  type RealtimeMessage,
} from "@shared/constants/realtime";

/** 用户的通知频道名：每个用户一个通知中心实例 */
export function notificationChannel(userId: number): string {
  return `user:${userId}`;
}

/**
 * 实时通知中心（Durable Object）：每个用户一个实例，保持这个用户打开着的画面的 WebSocket 连接。
 * 使用 Hibernation API：连接保持期间实例可以休眠，没有消息时不计费。
 * 不保存任何数据（免费计划要求使用 SQLite 存储的类，见 wrangler.jsonc 的 migrations）。
 */
export class NotificationHub extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // 前端定期发送 ping 确认连接还在，由运行时直接回复 pong，不唤醒实例
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(REALTIME_PING, REALTIME_PONG));
  }

  /** 建立连接（由 /api/realtime 检查登录后转过来） */
  override async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, {
      status: 101,
      webSocket: pair[0],
      // 必须回复前端请求的子协议之一，否则浏览器会断开连接
      headers: { "Sec-WebSocket-Protocol": REALTIME_PROTOCOL },
    });
  }

  /** 通知这个用户打开着的所有画面：数据有变化 */
  notify(): void {
    const message = JSON.stringify({ type: "changed" } satisfies RealtimeMessage);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // 正在断开的连接发送失败，忽略
      }
    }
  }

  // 前端只发送 ping（由自动回复处理），其他消息忽略
  override webSocketMessage(): void {}
}
