import { env } from "cloudflare:test";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { lessons, messages, weeklySchedules } from "../db/schema";
import { FILL_WEEKLY_LESSONS_CRON, runScheduledJobs } from "../jobs";
import {
  addApprovedCredits,
  createLesson,
  createRegisteredUser,
  createRelation,
  createTeacherAndStudent,
  testDb,
} from "../test/factories";
import { createScheduleService } from "./schedule-service";

// 用日本时间写的时刻（例如 "2026-11-10T12:00"），转为 Date。2026-11-02 是周一
function jst(local: string): Date {
  return new Date(`${local}:00+09:00`);
}

const MONDAY_13 = { weekday: 1, startHour: 13 };
const THURSDAY_13 = { weekday: 4, startHour: 13 };

async function setup(credits = 20) {
  const pair = await createTeacherAndStudent();
  if (credits > 0) await addApprovedCredits(pair.relation, credits);
  return { ...pair, service: createScheduleService(testDb()) };
}

// 这个关系的课（按开始时间升序）
function lessonsOf(relationId: number) {
  return testDb()
    .select()
    .from(lessons)
    .where(eq(lessons.teacherStudentId, relationId))
    .orderBy(asc(lessons.startsAt));
}

async function scheduledTimes(relationId: number) {
  return (await lessonsOf(relationId))
    .filter((lesson) => lesson.status === "scheduled")
    .map((lesson) => lesson.startsAt);
}

describe("每周课程的自动补齐", () => {
  it("保存每周课程后，立即排好本月剩下的课", async () => {
    const { teacher, relation, service } = await setup();
    const result = await service.saveWeekly(
      teacher,
      relation.id,
      [MONDAY_13],
      jst("2026-11-10T12:00"),
    );
    expect(result.createdLessons).toBe(3);
    expect(await scheduledTimes(relation.id)).toEqual([
      jst("2026-11-16T13:00"),
      jst("2026-11-23T13:00"),
      jst("2026-11-30T13:00"),
    ]);
  });

  it("每月最后一天会排到下个月底", async () => {
    const { teacher, relation, service } = await setup();
    await service.saveWeekly(teacher, relation.id, [MONDAY_13], jst("2026-11-30T00:00"));
    expect(await scheduledTimes(relation.id)).toEqual([
      jst("2026-11-30T13:00"),
      jst("2026-12-07T13:00"),
      jst("2026-12-14T13:00"),
      jst("2026-12-21T13:00"),
      jst("2026-12-28T13:00"),
    ]);
  });

  it("课时不足时按日期先后排到用完为止；确认新的课时后补排", async () => {
    const { teacher, relation, service } = await setup(2);
    const now = jst("2026-11-10T12:00");
    await service.saveWeekly(teacher, relation.id, [MONDAY_13], now);
    expect(await scheduledTimes(relation.id)).toEqual([
      jst("2026-11-16T13:00"),
      jst("2026-11-23T13:00"),
    ]);

    await addApprovedCredits(relation, 5);
    expect(await service.fillRelation(relation, now)).toBe(1);
    expect((await scheduledTimes(relation.id)).at(-1)).toEqual(jst("2026-11-30T13:00"));
  });

  it("已取消的时段不会重新排上；老师在别的学生那里有课的时段跳过；执行两次结果相同", async () => {
    const { teacher, relation, service } = await setup();
    await createLesson(relation, jst("2026-11-16T13:00"), { status: "cancelled" });
    const otherStudent = await createRegisteredUser("student");
    const otherRelation = await createRelation(teacher, otherStudent);
    await createLesson(otherRelation, jst("2026-11-23T13:00"));

    const now = jst("2026-11-10T12:00");
    await service.saveWeekly(teacher, relation.id, [MONDAY_13], now);
    expect(await scheduledTimes(relation.id)).toEqual([jst("2026-11-30T13:00")]);
    expect(await service.fillRelation(relation, now)).toBe(0);
  });
});

describe("保存每周课程", () => {
  it("只处理有变化的时段：保留的时段课不变，去掉的时段中没有留言的课删除、有留言的课取消", async () => {
    const { teacher, student, relation, service } = await setup();
    const now = jst("2026-11-10T12:00");
    await service.saveWeekly(teacher, relation.id, [MONDAY_13, THURSDAY_13], now);
    const before = await lessonsOf(relation.id);
    expect(before).toHaveLength(6);
    const thursday19 = before.find(
      (l) => l.startsAt.getTime() === jst("2026-11-19T13:00").getTime(),
    );
    if (!thursday19) throw new Error("没有排出 11/19 的课");
    await testDb()
      .insert(messages)
      .values({ lessonId: thursday19.id, senderId: student.id, body: "这节课想练习会话" });

    const result = await service.saveWeekly(teacher, relation.id, [MONDAY_13], now);
    expect(result).toMatchObject({ slots: [MONDAY_13], createdLessons: 0 });

    const after = await lessonsOf(relation.id);
    const mondayIds = (rows: typeof before) =>
      rows.filter((l) => l.startsAt.getUTCDay() === 1).map((l) => l.id);
    expect(mondayIds(after)).toEqual(mondayIds(before));
    expect(after.filter((l) => l.status === "scheduled")).toHaveLength(3);
    expect(after.find((l) => l.id === thursday19.id)).toMatchObject({ status: "cancelled" });
    expect(after).toHaveLength(4);
    const records = await testDb()
      .select()
      .from(messages)
      .where(and(eq(messages.lessonId, thursday19.id), eq(messages.type, "cancel")));
    expect(records).toHaveLength(1);
  });

  it("与这位老师其他学生的每周时段冲突时不能保存", async () => {
    const { teacher, relation, service } = await setup();
    const otherRelation = await createRelation(teacher, await createRegisteredUser("student"));
    const now = jst("2026-11-10T12:00");
    await service.saveWeekly(teacher, otherRelation.id, [MONDAY_13], now);
    await expect(service.saveWeekly(teacher, relation.id, [MONDAY_13], now)).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("学生和管理员不能保存", async () => {
    const { student, relation, service } = await setup();
    const admin = await createRegisteredUser("student", { isAdmin: true });
    const now = jst("2026-11-10T12:00");
    await expect(service.saveWeekly(student, relation.id, [], now)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.saveWeekly(admin, relation.id, [], now)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("添加单次课程", () => {
  const now = jst("2026-11-10T12:00");

  it("在可选的时段添加一节课", async () => {
    const { teacher, relation, service } = await setup();
    const lesson = await service.addSingleLesson(
      teacher,
      relation.id,
      jst("2026-11-12T15:00"),
      now,
    );
    expect(lesson).toMatchObject({ weekly: false, status: "scheduled", durationMinutes: 50 });
  });

  it.each([
    ["不是整点", "2026-11-12T15:30"],
    ["早于 8:00", "2026-11-12T07:00"],
    ["晚于 21:00", "2026-11-12T22:00"],
    ["已过去", "2026-11-10T11:00"],
  ])("%s时不能添加", async (_, local) => {
    const { teacher, relation, service } = await setup();
    await expect(
      service.addSingleLesson(teacher, relation.id, jst(local), now),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("老师在这个时间有别的学生的课时不能添加", async () => {
    const { teacher, relation, service } = await setup();
    const otherRelation = await createRelation(teacher, await createRegisteredUser("student"));
    await createLesson(otherRelation, jst("2026-11-12T15:00"));
    await expect(
      service.addSingleLesson(teacher, relation.id, jst("2026-11-12T15:00"), now),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("剩余课时为 0 时不能添加", async () => {
    const { teacher, relation, service } = await setup(0);
    await expect(
      service.addSingleLesson(teacher, relation.id, jst("2026-11-12T15:00"), now),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CREDITS" });
  });
});

describe("排课画面的数据", () => {
  it("一周 7 天 × 14 个时段，标出这个学生的课、别的课、已过去的时段", async () => {
    const { teacher, relation, service } = await setup();
    const now = jst("2026-11-04T12:00");
    const mine = await createLesson(relation, jst("2026-11-05T13:00"));
    const otherRelation = await createRelation(teacher, await createRegisteredUser("student"));
    await createLesson(otherRelation, jst("2026-11-06T10:00"));

    const board = await service.getBoard(teacher, relation.id, "2026-11-05", now);
    expect(board.weekStart).toBe("2026-11-02");
    expect(board.days.map((d) => d.date)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(board.days[0]?.cells).toHaveLength(14);
    const cell = (day: number, hour: number) => board.days[day]?.cells.find((c) => c.hour === hour);
    expect(cell(3, 13)).toMatchObject({ state: "mine", lessonId: mine.id });
    expect(cell(4, 10)).toMatchObject({ state: "busy" });
    expect(cell(2, 11)).toMatchObject({ state: "past" });
    expect(cell(2, 13)).toMatchObject({ state: "free" });
    expect(board.remainingCredits).toBe(19);
  });
});

describe("定时任务", () => {
  it("日本时间 0:00 的定时任务按每周课程补排课程", async () => {
    const { relation } = await setup();
    await testDb()
      .insert(weeklySchedules)
      .values({ teacherStudentId: relation.id, ...THURSDAY_13 });

    await runScheduledJobs(
      {
        cron: FILL_WEEKLY_LESSONS_CRON,
        scheduledTime: jst("2026-11-20T00:00").getTime(),
        noRetry: () => {},
      },
      env,
    );
    expect(await scheduledTimes(relation.id)).toEqual([jst("2026-11-26T13:00")]);
  });
});
