import { describe, expect, it } from "vitest";
import type { TeacherStudent, User } from "../db/schema";
import { canViewRelation, isRegistered, isRelationStudent, isRelationTeacher } from "./access";

function user(overrides: Partial<User>): User {
  const now = new Date();
  return {
    id: 1,
    lineUserId: "U_x",
    lineDisplayName: "",
    pictureUrl: null,
    name: null,
    introduction: null,
    role: null,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const relation: TeacherStudent = {
  id: 10,
  teacherId: 1,
  studentId: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("isRegistered", () => {
  it("身份和名字都有才算完成首次设置", () => {
    expect(isRegistered(user({ role: "student", name: "王" }))).toBe(true);
    expect(isRegistered(user({ role: "student" }))).toBe(false);
    expect(isRegistered(user({ name: "王" }))).toBe(false);
  });
});

describe("师生关系的权限", () => {
  const teacher = user({ id: 1, role: "teacher", name: "老师" });
  const student = user({ id: 2, role: "student", name: "学生" });
  const other = user({ id: 3, role: "student", name: "别人" });
  const admin = user({ id: 4, role: "student", name: "管理员", isAdmin: true });

  it("关系的双方和管理员可以查看，其他人不行", () => {
    expect(canViewRelation(teacher, relation)).toBe(true);
    expect(canViewRelation(student, relation)).toBe(true);
    expect(canViewRelation(admin, relation)).toBe(true);
    expect(canViewRelation(other, relation)).toBe(false);
  });

  it("管理员不算关系中的老师或学生（只能查看）", () => {
    expect(isRelationTeacher(teacher, relation)).toBe(true);
    expect(isRelationStudent(student, relation)).toBe(true);
    expect(isRelationTeacher(admin, relation)).toBe(false);
    expect(isRelationStudent(admin, relation)).toBe(false);
  });
});
