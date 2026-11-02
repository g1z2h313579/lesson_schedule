// 留言类型：普通留言 / 请假 / 老师取消 / 老师改时间
// 后三种是取消课程时自动写入的记录，只保存理由，显示的文字由前端按界面语言生成
export const MESSAGE_TYPES = ["text", "leave", "cancel", "reschedule"] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];
