// 邀请的有效天数（创建后 7 天内有效）
export const INVITATION_VALID_DAYS = 7;

// 查看邀请时的状态：有效 / 已过期 / 已被使用 / 自己发出的 / 双方身份相同 / 两人已经关联
export const INVITATION_STATUSES = [
  "valid",
  "expired",
  "used",
  "self",
  "same_role",
  "already_linked",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];
