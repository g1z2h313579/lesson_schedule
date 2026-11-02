import type { Profile } from "@/api/relations";

type RelationLike = { teacher: Profile; student: Profile };

/**
 * 师生关系中「对方」的资料：自己是老师时为学生，自己是学生时为老师。
 * 自己不在这个关系中（管理员查看别人的关系）时返回 null，此时画面上同时显示双方。
 */
export function partnerOf(relation: RelationLike, myId: number): Profile | null {
  if (relation.teacher.id === myId) return relation.student;
  if (relation.student.id === myId) return relation.teacher;
  return null;
}

/** 列表中显示的人：对方的名字；管理员查看别人的关系时为「老师 × 学生」 */
export function peopleLabel(relation: RelationLike, myId: number): string {
  return partnerOf(relation, myId)?.name ?? `${relation.teacher.name} × ${relation.student.name}`;
}
