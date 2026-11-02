// 留言类型：普通留言 / 请假 / 老师取消 / 老师改时间
// 后三种是取消课程时自动写入的记录，只保存理由，显示的文字由前端按界面语言生成
export const MESSAGE_TYPES = ["text", "leave", "cancel", "reschedule"] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

// 留言的最大字数
export const MESSAGE_BODY_MAX_LENGTH = 2000;

// 一条留言最多附带的图片数
export const MESSAGE_IMAGE_MAX_COUNT = 9;

// 上传图片的最大大小（在手机上压缩后通常为 0.3～1 MB）
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// 可以上传的图片格式（手机上压缩后为 JPEG）
export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// 上传前在手机上压缩：长边最大的像素数（保证教材截图上的文字看得清）
export const IMAGE_MAX_EDGE = 2048;
