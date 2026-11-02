// API 错误码：前端根据错误码显示对应语言的提示文字（文案在 web/src/i18n/locales 的 errors 中）
export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
  // 以下为业务错误（状态码多为 403 / 409），场景见 docs/implementation-plan.md 第 3.3 节
  // 未完成首次设置
  "NOT_REGISTERED",
  // 已完成首次设置，又提交了一次
  "ALREADY_REGISTERED",
  // 邀请已过期 / 已被使用 / 是自己发出的 / 双方身份相同 / 两人已经关联
  "INVITATION_EXPIRED",
  "INVITATION_USED",
  "INVITATION_SELF",
  "INVITATION_SAME_ROLE",
  "ALREADY_LINKED",
  // 已有待处理的课时申请 / 申请已被处理
  "CREDIT_REQUEST_PENDING",
  "REQUEST_ALREADY_DECIDED",
  // 剩余课时不足
  "INSUFFICIENT_CREDITS",
  // 这个时段不能选（已过去、超出范围、老师或学生已有别的课）
  "SLOT_UNAVAILABLE",
  // 课已开始，不能再请假、取消或改时间
  "LESSON_ALREADY_STARTED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

// API 出错时统一返回的响应体
export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    // 面向开发者的说明（不直接展示给用户）
    message: string;
    details?: unknown;
  };
};
