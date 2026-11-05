import type { UserRole } from "@shared/constants/user";
import type { TeacherStudent, User } from "../db/schema";

// 权限判断集中写在这里，路由和 service 都使用这些函数（不在各处各写一遍）
// 规则见 docs/implementation-plan.md 第 3.2 节

// 已完成首次设置的用户（身份和名字都已填写）
export type RegisteredUser = User & { role: UserRole; name: string };

/** 是否已完成首次设置 */
export function isRegistered(user: User): user is RegisteredUser {
  return user.role !== null && user.name !== null;
}

/** 是否是这个师生关系中的老师（处理课时申请等只有这位老师能做） */
export function isRelationTeacher(user: User, relation: TeacherStudent): boolean {
  return relation.teacherId === user.id;
}

/** 是否是这个师生关系中的学生（申请课时等只有这个学生能做） */
export function isRelationStudent(user: User, relation: TeacherStudent): boolean {
  return relation.studentId === user.id;
}

/** 是否是这个师生关系的一方（排课、取消、改时间、留言，老师和学生都能做） */
export function isRelationMember(user: User, relation: TeacherStudent): boolean {
  return isRelationTeacher(user, relation) || isRelationStudent(user, relation);
}

/**
 * 能否查看这个师生关系（以及其中的课程、留言、图片）：关系的一方，或管理员。
 * 管理员只能查看，操作权限仍按 isRelationTeacher / isRelationStudent / isRelationMember 判断。
 */
export function canViewRelation(user: User, relation: TeacherStudent): boolean {
  return user.isAdmin || isRelationMember(user, relation);
}
