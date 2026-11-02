// 用户角色（前端、后端、数据库共用）
export const USER_ROLES = ["teacher", "student"] as const;

export type UserRole = (typeof USER_ROLES)[number];

// 名字、自我介绍的最大字数
export const USER_NAME_MAX_LENGTH = 50;
export const USER_INTRODUCTION_MAX_LENGTH = 1000;
