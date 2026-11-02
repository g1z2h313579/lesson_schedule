import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { lessons, messages } from "../db/schema";
import {
  addApprovedCredits,
  createLesson,
  createRegisteredUser,
  createTeacherAndStudent,
  getAs,
  jstSlot,
  sendJson,
  testDb,
} from "../test/factories";

type Permissions = {
  canLeave: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  canPost: boolean;
};

async function permissionsOf(lessonId: number, user: { lineUserId: string }) {
  const res = await getAs(`/api/lessons/${lessonId}`, user);
  return (await res.json<{ permissions: Permissions }>()).permissions;
}

function findLesson(id: number) {
  return testDb().query.lessons.findFirst({ where: eq(lessons.id, id) });
}

describe("课程表 GET /api/lessons", () => {
  it("返回范围内自己参与的课（含已取消），管理员看到全部，其他人看不到", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const scheduled = await createLesson(relation, jstSlot(2, 10));
    const cancelled = await createLesson(relation, jstSlot(3, 10), { status: "cancelled" });
    await createLesson(relation, jstSlot(40, 10));
    const query = `from=${jstSlot(1, 0).getTime()}&to=${jstSlot(10, 0).getTime()}`;

    const idsOf = async (user: { lineUserId: string }) =>
      (
        await (await getAs(`/api/lessons?${query}`, user)).json<{ lessons: { id: number }[] }>()
      ).lessons.map((l) => l.id);
    expect(await idsOf(student)).toEqual([scheduled.id, cancelled.id]);
    expect(await idsOf(teacher)).toEqual([scheduled.id, cancelled.id]);
    expect(await idsOf(await createRegisteredUser("student", { isAdmin: true }))).toEqual(
      expect.arrayContaining([scheduled.id, cancelled.id]),
    );
    expect(await idsOf(await createRegisteredUser("student"))).toEqual([]);
  });

  it("一次最多查询 62 天", async () => {
    const { student } = await createTeacherAndStudent();
    const res = await getAs(`/api/lessons?from=0&to=${63 * 86_400_000}`, student);
    expect(res.status).toBe(400);
  });
});

describe("课程详情与操作", () => {
  it("按角色和课程状态返回能做的操作", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const admin = await createRegisteredUser("student", { isAdmin: true });
    const future = await createLesson(relation, jstSlot(2, 10));
    const past = await createLesson(relation, jstSlot(-2, 10));

    expect(await permissionsOf(future.id, student)).toEqual({
      canLeave: true,
      canCancel: false,
      canReschedule: false,
      canPost: true,
    });
    expect(await permissionsOf(future.id, teacher)).toEqual({
      canLeave: false,
      canCancel: true,
      canReschedule: true,
      canPost: true,
    });
    expect(await permissionsOf(future.id, admin)).toEqual({
      canLeave: false,
      canCancel: false,
      canReschedule: false,
      canPost: false,
    });
    expect(await permissionsOf(past.id, student)).toMatchObject({ canLeave: false, canPost: true });
    const outsider = await getAs(
      `/api/lessons/${future.id}`,
      await createRegisteredUser("student"),
    );
    expect(outsider.status).toBe(404);
  });

  it("学生请假：课程变为已取消，留言板中留下请假记录，课时返还", async () => {
    const { student, relation } = await createTeacherAndStudent();
    await addApprovedCredits(relation, 1);
    const lesson = await createLesson(relation, jstSlot(2, 10));

    const res = await sendJson("POST", `/api/lessons/${lesson.id}/leave`, student, {
      reason: "感冒了",
    });
    expect(res.status).toBe(200);
    expect(await findLesson(lesson.id)).toMatchObject({
      status: "cancelled",
      cancelledById: student.id,
      cancelReason: "感冒了",
    });
    const records = await testDb().select().from(messages).where(eq(messages.lessonId, lesson.id));
    expect(records).toMatchObject([{ type: "leave", body: "感冒了", senderId: student.id }]);
    const detail = await (await getAs(`/api/relations/${relation.id}`, student)).json<{
      relation: { stats: { remainingCredits: number } };
    }>();
    expect(detail.relation.stats.remainingCredits).toBe(1);
  });

  it("不能请假的情况：老师请假、课已开始、课已取消", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const future = await createLesson(relation, jstSlot(2, 10));
    const started = await createLesson(relation, new Date(Date.now() - 10 * 60 * 1000));
    const cancelled = await createLesson(relation, jstSlot(3, 10), { status: "cancelled" });

    expect((await sendJson("POST", `/api/lessons/${future.id}/leave`, teacher)).status).toBe(403);
    const startedRes = await sendJson("POST", `/api/lessons/${started.id}/leave`, student);
    expect(await startedRes.json()).toMatchObject({ error: { code: "LESSON_ALREADY_STARTED" } });
    const cancelledRes = await sendJson("POST", `/api/lessons/${cancelled.id}/leave`, student);
    expect(await cancelledRes.json()).toMatchObject({
      error: { code: "LESSON_ALREADY_CANCELLED" },
    });
  });

  it("老师取消：学生不能取消", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(2, 10));
    expect((await sendJson("POST", `/api/lessons/${lesson.id}/cancel`, student)).status).toBe(403);
    expect((await sendJson("POST", `/api/lessons/${lesson.id}/cancel`, teacher)).status).toBe(200);
    expect(await findLesson(lesson.id)).toMatchObject({ status: "cancelled" });
  });

  it("老师改时间：原来的课取消并指向新课，留言板留下记录，课时不变", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    await addApprovedCredits(relation, 1);
    const lesson = await createLesson(relation, jstSlot(2, 10));
    const newStart = jstSlot(3, 15);

    const res = await sendJson("POST", `/api/lessons/${lesson.id}/reschedule`, teacher, {
      startsAt: newStart.getTime(),
    });
    expect(res.status).toBe(200);
    const { lesson: created } = await res.json<{ lesson: { id: number; startsAt: string } }>();
    expect(new Date(created.startsAt)).toEqual(newStart);

    expect(await findLesson(lesson.id)).toMatchObject({
      status: "cancelled",
      rescheduledToId: created.id,
    });
    const detail = await (await getAs(`/api/lessons/${lesson.id}`, student)).json<{
      rescheduledTo: { id: number } | null;
    }>();
    expect(detail.rescheduledTo).toMatchObject({ id: created.id });
    const records = await testDb().select().from(messages).where(eq(messages.lessonId, lesson.id));
    expect(records).toMatchObject([{ type: "reschedule" }]);
    const relationDetail = await (await getAs(`/api/relations/${relation.id}`, student)).json<{
      relation: { stats: { remainingCredits: number } };
    }>();
    expect(relationDetail.relation.stats.remainingCredits).toBe(0);
  });

  it("改到已有课的时间时不能改", async () => {
    const { teacher, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(2, 10));
    await createLesson(relation, jstSlot(3, 15));
    const res = await sendJson("POST", `/api/lessons/${lesson.id}/reschedule`, teacher, {
      startsAt: jstSlot(3, 15).getTime(),
    });
    expect(await res.json()).toMatchObject({ error: { code: "SLOT_UNAVAILABLE" } });
    expect(await findLesson(lesson.id)).toMatchObject({ status: "scheduled" });
  });
});

describe("留言板", () => {
  it("老师和学生可以留言，管理员只能查看", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const admin = await createRegisteredUser("student", { isAdmin: true });
    const lesson = await createLesson(relation, jstSlot(-1, 10));
    const path = `/api/lessons/${lesson.id}/messages`;

    expect((await sendJson("POST", path, student, { body: "今天的作业是什么？" })).status).toBe(
      200,
    );
    expect((await sendJson("POST", path, teacher, { body: "第 5 课的练习。" })).status).toBe(200);
    expect((await sendJson("POST", path, admin, { body: "管理员" })).status).toBe(403);
    expect((await sendJson("POST", path, student, { body: "   " })).status).toBe(400);

    const res = await getAs(path, admin);
    const body = await res.json<{ messages: { body: string; sender: { id: number } }[] }>();
    expect(body.messages.map((m) => [m.sender.id, m.body])).toEqual([
      [student.id, "今天的作业是什么？"],
      [teacher.id, "第 5 课的练习。"],
    ]);
  });

  it("只能删除自己发的普通留言，请假记录不能删除", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(2, 10));
    const path = `/api/lessons/${lesson.id}/messages`;
    const { message } = await (
      await sendJson("POST", path, student, { body: "要删除的留言" })
    ).json<{ message: { id: number } }>();
    await sendJson("POST", `/api/lessons/${lesson.id}/leave`, student);

    const list = async () =>
      (
        await (
          await getAs(path, student)
        ).json<{
          messages: { id: number; type: string; canDelete: boolean }[];
        }>()
      ).messages;
    const leaveRecord = (await list()).find((m) => m.type === "leave");
    if (!leaveRecord) throw new Error("没有请假记录");
    expect(leaveRecord.canDelete).toBe(false);

    expect((await sendJson("DELETE", `/api/messages/${message.id}`, teacher)).status).toBe(403);
    expect((await sendJson("DELETE", `/api/messages/${leaveRecord.id}`, student)).status).toBe(403);
    expect((await sendJson("DELETE", `/api/messages/${message.id}`, student)).status).toBe(200);
    expect((await list()).map((m) => m.type)).toEqual(["leave"]);
  });
});
