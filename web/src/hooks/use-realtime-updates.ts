import { MOCK_USER_ID_QUERY } from "@shared/constants/headers";
import { REALTIME_PING, REALTIME_PONG, REALTIME_PROTOCOL } from "@shared/constants/realtime";
import { useEffect } from "react";
import { getIdToken, isLiffMock } from "@/lib/liff";
import { getMockUserId } from "@/lib/mock-user";
import { invalidateAppData } from "@/lib/query-client";

// 每隔 25 秒发送 ping 确认连接还在；超过 60 秒没有收到 pong，就当作已断开，重新连接
const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;
// 断开后重新连接的等待时间：从 1 秒开始，每次加倍，最长 30 秒
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 30_000;

// 连接地址：与页面同一个域名（本地开发时附带模拟用户）
function realtimeUrl(): string {
  const url = new URL("/api/realtime", location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const mockUserId = isLiffMock ? getMockUserId() : undefined;
  if (mockUserId) url.searchParams.set(MOCK_USER_ID_QUERY, mockUserId);
  return url.toString();
}

/**
 * 实时更新：与服务器保持 WebSocket 连接，对方操作后会收到「有变化」的通知，自动重新加载数据。
 * - 小程序切到后台时连接可能被断开，所以切回来时重新连接，并重新加载一次（补上中间错过的变化）。
 * - 连接不上时（网络不好等），逐渐拉长间隔重试。
 * enabled 为 false（未完成首次设置）时不连接。
 */
export function useRealtimeUpdates(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let connecting = false;
    let disposed = false;
    let connectedBefore = false;
    let retryDelay = RETRY_MIN_MS;
    let retryTimer: number | undefined;
    let lastPongAt = 0;

    async function connect() {
      if (disposed || socket || connecting || document.visibilityState === "hidden") return;
      connecting = true;
      try {
        const token = await getIdToken();
        if (!token || disposed) return;
        const ws = new WebSocket(realtimeUrl(), [REALTIME_PROTOCOL, token]);
        socket = ws;
        ws.onopen = () => {
          retryDelay = RETRY_MIN_MS;
          lastPongAt = Date.now();
          // 重新连接时，断开期间可能错过了通知，重新加载一次
          if (connectedBefore) void invalidateAppData();
          connectedBefore = true;
        };
        ws.onmessage = (event) => {
          if (event.data === REALTIME_PONG) lastPongAt = Date.now();
          else void invalidateAppData();
        };
        ws.onclose = () => {
          // 已被替换掉的旧连接关闭时不处理
          if (socket !== ws) return;
          socket = null;
          scheduleRetry();
        };
      } catch {
        scheduleRetry();
      } finally {
        connecting = false;
      }
    }

    function scheduleRetry() {
      if (disposed || retryTimer !== undefined) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void connect();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }

    // 关掉现在的连接，马上重新连接
    function reconnectNow() {
      const old = socket;
      socket = null;
      old?.close();
      window.clearTimeout(retryTimer);
      retryTimer = undefined;
      retryDelay = RETRY_MIN_MS;
      void connect();
    }

    const heartbeat = window.setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastPongAt > HEARTBEAT_TIMEOUT_MS) reconnectNow();
      else socket.send(REALTIME_PING);
    }, HEARTBEAT_INTERVAL_MS);

    // 切回小程序时：后台期间的连接不一定还有效，重新连接（连接成功后会重新加载数据）
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") reconnectNow();
    };
    // 网络恢复时：还没有连接就马上连接
    const handleOnline = () => {
      if (!socket) reconnectNow();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    void connect();

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      const old = socket;
      socket = null;
      old?.close();
    };
  }, [enabled]);
}
