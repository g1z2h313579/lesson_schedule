// 课程相关的常量（前端、后端、数据库共用）

// 每节课的时长（分钟）
export const LESSON_DURATION_MINUTES = 50;

// 可选的上课开始时间：日本时间 8:00～21:00 的整点（最后一节 21:00～21:50）
export const LESSON_START_HOUR_MIN = 8;
export const LESSON_START_HOUR_MAX = 21;

// 课程状态：已安排 / 已取消
// 没有「已上」状态：状态为 scheduled 且结束时间已过的课，就算作已上
export const LESSON_STATUSES = ["scheduled", "cancelled"] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];

// 请假、取消、改时间的理由的最大字数
export const LESSON_REASON_MAX_LENGTH = 500;
