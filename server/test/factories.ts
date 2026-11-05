import { env } from "cloudflare:test";
import { MOCK_USER_ID_HEADER } from "@shared/constants/headers";
import type { UserRole } from "@shared/constants/user";
import { fromJst, toJstParts } from "@shared/lib/jst";
import { app } from "../app";
import { createDb } from "../db/client";
import {
  creditRequests,
  lessons,
  type NewLesson,
  type NewUser,
  teacherStudents,
  users,
} from "../db/schema";
import { createNotifier } from "../services/notifier";

// 测试数据的生成工具
// 同一个测试文件中的数据库是共用的，所以每次都生成不同的 LINE userId，避免测试之间互相影响

let sequence = 0;

export function testDb() {
  return createDb(env.DB);
}

/** 直接调用 service 时使用的实时通知（与线上相同，通知发给测试环境中的通知中心） */
export function testNotifier() {
  return createNotifier(testDb(), env.NOTIFICATION_HUB);
}

/** 生成不重复的 LINE userId */
export function uniqueLineUserId(prefix = "U_test"): string {
  sequence += 1;
  return `${prefix}_${sequence}_${crypto.randomUUID().slice(0, 8)}`;
}

/** 以某个用户的身份调用接口时使用的请求头（测试环境 AUTH_MOCK=true，不校验 token） */
export function authHeaders(user: { lineUserId: string }): Record<string, string> {
  return { Authorization: "Bearer mock-token", [MOCK_USER_ID_HEADER]: user.lineUserId };
}

/** 新建用户（默认为未完成首次设置的用户） */
export async function createUser(overrides: Partial<NewUser> = {}) {
  const [user] = await testDb()
    .insert(users)
    .values({ lineUserId: uniqueLineUserId(), lineDisplayName: "LINE 昵称", ...overrides })
    .returning();
  if (!user) throw new Error("测试用户写入失败");
  return user;
}

/** 新建已完成首次设置的老师或学生 */
export function createRegisteredUser(role: UserRole, overrides: Partial<NewUser> = {}) {
  return createUser({ role, name: role === "teacher" ? "测试老师" : "测试学生", ...overrides });
}

/** 新建师生关系 */
export async function createRelation(teacher: { id: number }, student: { id: number }) {
  const [relation] = await testDb()
    .insert(teacherStudents)
    .values({ teacherId: teacher.id, studentId: student.id })
    .returning();
  if (!relation) throw new Error("测试用师生关系写入失败");
  return relation;
}

/** 给师生关系加上已确认的课时 */
export async function addApprovedCredits(relation: { id: number }, amount: number) {
  const [request] = await testDb()
    .insert(creditRequests)
    .values({ teacherStudentId: relation.id, amount, status: "approved", decidedAt: new Date() })
    .returning();
  if (!request) throw new Error("测试用课时申请写入失败");
  return request;
}

/** 新建课程 */
export async function createLesson(
  relation: { id: number },
  startsAt: Date,
  overrides: Partial<NewLesson> = {},
) {
  const [lesson] = await testDb()
    .insert(lessons)
    .values({ teacherStudentId: relation.id, startsAt, ...overrides })
    .returning();
  if (!lesson) throw new Error("测试用课程写入失败");
  return lesson;
}

/** 以某个用户的身份发送 JSON 请求（POST / PUT / PATCH / DELETE） */
export function sendJson(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  user: { lineUserId: string },
  body: unknown = {},
) {
  return app.request(
    path,
    {
      method,
      headers: { ...authHeaders(user), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
}

/** 以某个用户的身份发送 GET 请求 */
export function getAs(path: string, user: { lineUserId: string }) {
  return app.request(path, { headers: authHeaders(user) }, env);
}

/** 从今天（日本时间）起第 days 天的 hour 点（日本时间），用于生成将来或过去的上课时间 */
export function jstSlot(days: number, hour: number): Date {
  const { year, month, day } = toJstParts(new Date());
  return fromJst(year, month, day + days, hour);
}

/** 新建老师和学生，并建立师生关系 */
export async function createTeacherAndStudent() {
  const teacher = await createRegisteredUser("teacher");
  const student = await createRegisteredUser("student");
  const relation = await createRelation(teacher, student);
  return { teacher, student, relation };
}
