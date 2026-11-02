// 课时申请的状态：待处理 / 已确认 / 已拒绝 / 已撤回
export const CREDIT_REQUEST_STATUSES = ["pending", "approved", "rejected", "withdrawn"] as const;

export type CreditRequestStatus = (typeof CREDIT_REQUEST_STATUSES)[number];
