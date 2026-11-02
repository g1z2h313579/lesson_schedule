// LINE Messaging API：通过官方账号给用户推送消息（用于课前提醒等）
// 注意：免费计划每月只能推送 200 条（按接收人数计算），回复消息不计数

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

export type LineTextMessage = {
  type: "text";
  text: string;
};

/**
 * 给指定用户推送消息（一次最多 5 条）。
 * @param accessToken 官方账号的 Channel access token（env.LINE_CHANNEL_ACCESS_TOKEN）
 * @param to 接收者的 LINE userId
 */
export async function pushLineMessages(
  accessToken: string,
  to: string,
  messages: LineTextMessage[],
): Promise<void> {
  if (!accessToken) {
    throw new Error("未设置 LINE_CHANNEL_ACCESS_TOKEN");
  }

  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    throw new Error(`LINE 推送失败（${res.status}）：${await res.text()}`);
  }
}
