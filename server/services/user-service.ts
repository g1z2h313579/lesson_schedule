import type { Database } from "../db/client";
import type { LineUser } from "../lib/line/id-token";
import { createUserRepository } from "../repositories/user-repository";

// 用户相关的业务逻辑（路由只负责收发请求，具体处理放在 service 中）
export function createUserService(db: Database) {
  const userRepository = createUserRepository(db);

  return {
    // 登录后同步 LINE 用户信息，返回本系统中的用户
    syncLineUser(lineUser: LineUser) {
      return userRepository.upsertFromLine(lineUser);
    },
  };
}
