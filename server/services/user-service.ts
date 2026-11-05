import type { RegistrationValues, UpdateProfileValues } from "@shared/schemas/me";
import type { Database } from "../db/client";
import type { User } from "../db/schema";
import { ApiError } from "../lib/errors";
import type { LineUser } from "../lib/line/id-token";
import { fetchLineProfile } from "../lib/line/profile";
import { createUserRepository } from "../repositories/user-repository";
import type { Notifier } from "./notifier";

// 用户相关的业务逻辑（路由只负责收发请求，具体处理放在 service 中）
export function createUserService(db: Database, notifier: Notifier) {
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

    /**
     * 首次设置：选择身份、填写名字和自我介绍。
     * 身份选定后用户自己不能修改（选错时由管理员直接修改数据库），所以已设置过时报错。
     */
    async register(user: User, values: RegistrationValues) {
      if (user.role !== null) {
        throw new ApiError(409, "ALREADY_REGISTERED", "已完成首次设置");
      }
      const registered = await userRepository.register(user.id, {
        role: values.role,
        name: values.name,
        introduction: values.introduction ?? null,
      });
      // 同时提交了两次时，后执行的那次在这里报错
      if (!registered) {
        throw new ApiError(409, "ALREADY_REGISTERED", "已完成首次设置");
      }
      return registered;
    },

    /** 修改名字、自我介绍（身份不能修改），通知关联的人 */
    async updateProfile(user: User, values: UpdateProfileValues) {
      const updated = await userRepository.updateProfile(user.id, values);
      await notifier.profileChanged(updated);
      return updated;
    },
  };
}
