// 用户角色（前端、后端、数据库共用）
export const USER_ROLES = ["teacher", "student"] as const;

export type UserRole = (typeof USER_ROLES)[number];
