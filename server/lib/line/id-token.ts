import { z } from "zod";
import { ApiError } from "../errors";

// 从 LINE ID token 中得到的用户信息
// 用户未同意 profile 权限时，ID token 中没有昵称和头像（displayName 为 null）
export type LineUser = {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
};

const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

// LINE 校验接口返回的内容（只取用到的字段）
const verifyResponseSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

/**
 * 通过 LINE 官方接口校验前端传来的 ID token，并取出用户信息。
 * 前端通过 liff.getIDToken() 获取 ID token（MINI App 渠道需要开启 openid scope）。
 */
export async function verifyLineIdToken(idToken: string, channelId: string): Promise<LineUser> {
  if (!channelId) {
    throw new ApiError(500, "CONFIG_ERROR", "未设置 LINE_CHANNEL_ID");
  }

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!res.ok) {
    // 常见原因：token 已过期、channelId 不匹配
    throw new ApiError(401, "UNAUTHORIZED", `LINE ID token 校验失败（${res.status}）`);
  }

  const payload = verifyResponseSchema.parse(await res.json());
  return {
    userId: payload.sub,
    displayName: payload.name ?? null,
    pictureUrl: payload.picture ?? null,
  };
}
