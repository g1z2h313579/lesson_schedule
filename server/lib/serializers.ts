import type { User } from "../db/schema";
import { isRegistered } from "./access";

// 把表数据转换为接口返回的格式：只返回前端需要的字段（不返回 LINE userId 等）

/** 当前登录用户自己的信息（GET /api/me） */
export function toMe(user: User) {
  return {
    id: user.id,
    name: user.name,
    lineDisplayName: user.lineDisplayName,
    pictureUrl: user.pictureUrl,
    introduction: user.introduction,
    role: user.role,
    isAdmin: user.isAdmin,
    // 是否已完成首次设置（前端据此决定是否跳转到首次设置页）
    registered: isRegistered(user),
  };
}
