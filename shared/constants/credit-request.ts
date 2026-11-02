// 课时申请的状态：待处理 / 已确认 / 已拒绝 / 已撤回
export const CREDIT_REQUEST_STATUSES = ["pending", "approved", "rejected", "withdrawn"] as const;

export type CreditRequestStatus = (typeof CREDIT_REQUEST_STATUSES)[number];

// 一次申请的课时数上限、备注和拒绝理由的最大字数
export const CREDIT_REQUEST_MAX_AMOUNT = 100;
export const CREDIT_REQUEST_NOTE_MAX_LENGTH = 500;
