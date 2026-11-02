import type { Database } from "../db/client";
import type { TeacherStudent, User } from "../db/schema";
import { canViewRelation, isRelationStudent, isRelationTeacher } from "../lib/access";
import { ApiError } from "../lib/errors";
import { createRelationRepository } from "../repositories/relation-repository";

// 各 service 共用：取得师生关系并检查权限

/** 取得用户能查看的师生关系。不存在或看不到时都返回 404（不透露对象是否存在） */
export async function getViewableRelation(
  db: Database,
  user: User,
  relationId: number,
): Promise<TeacherStudent> {
  const relation = await createRelationRepository(db).findById(relationId);
  if (!relation || !canViewRelation(user, relation)) {
    throw new ApiError(404, "NOT_FOUND", "师生关系不存在");
  }
  return relation;
}

/** 要求是这个关系中的老师（管理员只能查看，不能操作） */
export function assertRelationTeacher(user: User, relation: TeacherStudent): void {
  if (!isRelationTeacher(user, relation)) {
    throw new ApiError(403, "FORBIDDEN", "只有这个关系中的老师能操作");
  }
}

/** 要求是这个关系中的学生 */
export function assertRelationStudent(user: User, relation: TeacherStudent): void {
  if (!isRelationStudent(user, relation)) {
    throw new ApiError(403, "FORBIDDEN", "只有这个关系中的学生能操作");
  }
}
