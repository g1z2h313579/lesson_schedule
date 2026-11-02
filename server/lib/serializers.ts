import type { CreditRequest, Lesson, User } from "../db/schema";
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

/** 其他用户的公开资料（显示在列表、详情、留言中） */
export function toProfile(user: User) {
  return {
    id: user.id,
    // 名字为空（未完成首次设置）时显示 LINE 昵称
    name: user.name ?? user.lineDisplayName,
    pictureUrl: user.pictureUrl,
    introduction: user.introduction,
    role: user.role,
  };
}

export type Profile = ReturnType<typeof toProfile>;

/** 课时申请 */
export function toCreditRequest(request: CreditRequest) {
  return {
    id: request.id,
    amount: request.amount,
    note: request.note,
    status: request.status,
    rejectReason: request.rejectReason,
    decidedAt: request.decidedAt,
    createdAt: request.createdAt,
  };
}

/** 课程 */
export function toLesson(lesson: Lesson) {
  return {
    id: lesson.id,
    relationId: lesson.teacherStudentId,
    startsAt: lesson.startsAt,
    durationMinutes: lesson.durationMinutes,
    status: lesson.status,
    // 是否由每周课程自动排出
    weekly: lesson.weeklyScheduleId !== null,
    cancelReason: lesson.cancelReason,
    rescheduledToId: lesson.rescheduledToId,
  };
}
