// 实时通知（WebSocket）前后端共用的常量

// WebSocket 的子协议名。浏览器的 WebSocket 不能设置请求头，所以 ID token 也作为子协议一起发送
export const REALTIME_PROTOCOL = "lesson-schedule";

// 前端定期发送 ping 确认连接还在，服务器回复 pong
export const REALTIME_PING = "ping";
export const REALTIME_PONG = "pong";

// 服务器发给前端的消息：数据有变化（前端收到后重新加载数据，内容不随消息发送）
export type RealtimeMessage = { type: "changed" };
