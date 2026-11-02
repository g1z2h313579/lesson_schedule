import { z } from "zod";

// LINE 个人资料（昵称、头像）
export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
};

const PROFILE_URL = "https://api.line.me/v2/profile";

// LINE 个人资料接口返回的内容（只取用到的字段）
const profileResponseSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  pictureUrl: z.string().optional(),
});

/**
 * 用前端传来的 access token 获取 LINE 个人资料。
 * 需要用户同意 profile 权限。MINI App 首次打开时只授权 openid，
 * 用户在验证画面同意之前会取不到（此时返回 null，不影响登录）。
 */
export async function fetchLineProfile(accessToken: string): Promise<LineProfile | null> {
  const res = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    // 常见原因：未同意 profile 权限、access token 已过期
    console.warn(`[LINE] 获取个人资料失败（${res.status}）`);
    return null;
  }

  const payload = profileResponseSchema.parse(await res.json());
  return {
    userId: payload.userId,
    displayName: payload.displayName,
    pictureUrl: payload.pictureUrl ?? null,
  };
}
