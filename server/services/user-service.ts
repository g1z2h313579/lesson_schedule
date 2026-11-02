import type { Database } from "../db/client";
import type { LineUser } from "../lib/line/id-token";
import { fetchLineProfile } from "../lib/line/profile";
import { createUserRepository } from "../repositories/user-repository";

// 用户相关的业务逻辑（路由只负责收发请求，具体处理放在 service 中）
export function createUserService(db: Database) {
  const userRepository = createUserRepository(db);

  return {
    /**
     * 登录后同步 LINE 用户信息，返回本系统中的用户。
     * 传入 access token 时，用 LINE 个人资料接口获取最新的昵称和头像
     * （MINI App 的 ID token 在用户同意 profile 权限之前不含昵称）。
     */
    async syncLineUser(lineUser: LineUser, accessToken?: string) {
      const profile = accessToken ? await fetchLineProfile(accessToken) : null;
      // 只采用与 ID token 同一用户的资料，防止用别人的 access token 改写昵称
      const merged =
        profile && profile.userId === lineUser.userId
          ? { ...lineUser, displayName: profile.displayName, pictureUrl: profile.pictureUrl }
          : lineUser;
      return userRepository.upsertFromLine(merged);
    },
  };
}
