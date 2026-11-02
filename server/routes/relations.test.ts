import { describe, expect, it } from "vitest";
import { creditRequests } from "../db/schema";
import {
  addApprovedCredits,
  createLesson,
  createRegisteredUser,
  createTeacherAndStudent,
  getAs,
  sendJson,
  testDb,
} from "../test/factories";

type Stats = {
  totalCredits: number;
  scheduledCount: number;
  doneCount: number;
  remainingCredits: number;
  nextLesson: { id: number } | null;
};
type RelationItem = { id: number; stats: Stats; hasPendingCreditRequest: boolean };

const HOUR = 60 * 60 * 1000;

describe("GET /api/relations", () => {
  it("只返回自己参与的关系；管理员看到全部", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const outsider = await createRegisteredUser("student");
    const admin = await createRegisteredUser("student", { isAdmin: true });

    const idsOf = async (user: { lineUserId: string }) =>
      (
        await (await getAs("/api/relations", user)).json<{ relations: RelationItem[] }>()
      ).relations.map((r) => r.id);
    expect(await idsOf(teacher)).toEqual([relation.id]);
    expect(await idsOf(student)).toEqual([relation.id]);
    expect(await idsOf(outsider)).toEqual([]);
    expect(await idsOf(admin)).toContain(relation.id);
  });

  it("统计：只计算已确认的课时，已取消的课不计入，结束的课算已上，正在上的课算下一节课", async () => {
    const { student, relation } = await createTeacherAndStudent();
    await addApprovedCredits(relation, 10);
    await testDb()
      .insert(creditRequests)
      .values({ teacherStudentId: relation.id, amount: 5, status: "pending" });
    const now = Date.now();
    // 已结束 2 节、已取消 1 节、正在上 1 节、将来 1 节
    await createLesson(relation, new Date(now - 48 * HOUR));
    await createLesson(relation, new Date(now - 24 * HOUR));
    await createLesson(relation, new Date(now - 12 * HOUR), { status: "cancelled" });
    const ongoing = await createLesson(relation, new Date(now - 10 * 60 * 1000));
    await createLesson(relation, new Date(now + 24 * HOUR));

    const res = await getAs(`/api/relations/${relation.id}`, student);
    expect(res.status).toBe(200);
    const body = await res.json<{
      relation: RelationItem & { pendingCreditRequest: { amount: number } | null };
    }>();
    expect(body.relation.stats).toMatchObject({
      totalCredits: 10,
      scheduledCount: 4,
      doneCount: 2,
      remainingCredits: 6,
      nextLesson: { id: ongoing.id },
    });
    expect(body.relation.hasPendingCreditRequest).toBe(true);
    expect(body.relation.pendingCreditRequest).toMatchObject({ amount: 5 });
  });

  it("看不到别人的关系（404）", async () => {
    const { relation } = await createTeacherAndStudent();
    const res = await getAs(`/api/relations/${relation.id}`, await createRegisteredUser("student"));
    expect(res.status).toBe(404);
  });

  it("课程列表：即将上的课（时间升序）和已上的课（时间降序）", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const now = Date.now();
    const past1 = await createLesson(relation, new Date(now - 48 * HOUR));
    const past2 = await createLesson(relation, new Date(now - 24 * HOUR));
    const future1 = await createLesson(relation, new Date(now + 24 * HOUR));
    const future2 = await createLesson(relation, new Date(now + 48 * HOUR));

    const list = async (query: string) =>
      (
        await (
          await getAs(`/api/relations/${relation.id}/lessons?${query}`, student)
        ).json<{
          lessons: { id: number }[];
          hasMore: boolean;
        }>()
      ).lessons.map((l) => l.id);
    expect(await list("scope=upcoming")).toEqual([future1.id, future2.id]);
    expect(await list("scope=past")).toEqual([past2.id, past1.id]);
    expect(await list(`scope=past&before=${now - 24 * HOUR}`)).toEqual([past1.id]);
  });
});

describe("课时申请", () => {
  it("学生申请 → 老师确认后计入总课时", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const created = await sendJson(
      "POST",
      `/api/relations/${relation.id}/credit-requests`,
      student,
      {
        amount: 8,
        note: "  11 月份的课  ",
      },
    );
    expect(created.status).toBe(200);
    const { request } = await created.json<{ request: { id: number; note: string } }>();
    expect(request.note).toBe("11 月份的课");

    const approved = await sendJson("POST", `/api/credit-requests/${request.id}/approve`, teacher);
    expect(approved.status).toBe(200);
    const detail = await (await getAs(`/api/relations/${relation.id}`, student)).json<{
      relation: RelationItem;
    }>();
    expect(detail.relation.stats.totalCredits).toBe(8);
  });

  it("已有待处理的申请时不能再申请（409）", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const path = `/api/relations/${relation.id}/credit-requests`;
    await sendJson("POST", path, student, { amount: 4 });
    const res = await sendJson("POST", path, student, { amount: 4 });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: "CREDIT_REQUEST_PENDING" } });
  });

  it("角色不对时不能操作：老师不能申请、学生不能确认、管理员都不能", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const admin = await createRegisteredUser("student", { isAdmin: true });
    const path = `/api/relations/${relation.id}/credit-requests`;
    expect((await sendJson("POST", path, teacher, { amount: 4 })).status).toBe(403);
    expect((await sendJson("POST", path, admin, { amount: 4 })).status).toBe(403);

    const { request } = await (await sendJson("POST", path, student, { amount: 4 })).json<{
      request: { id: number };
    }>();
    expect(
      (await sendJson("POST", `/api/credit-requests/${request.id}/approve`, student)).status,
    ).toBe(403);
    expect(
      (await sendJson("POST", `/api/credit-requests/${request.id}/approve`, admin)).status,
    ).toBe(403);
  });

  it("已处理的申请不能再处理（409），拒绝时记下理由，学生可以撤回", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const path = `/api/relations/${relation.id}/credit-requests`;
    const create = async () =>
      (
        await (
          await sendJson("POST", path, student, { amount: 4 })
        ).json<{ request: { id: number } }>()
      ).request.id;

    const rejectedId = await create();
    const rejected = await sendJson("POST", `/api/credit-requests/${rejectedId}/reject`, teacher, {
      reason: "下个月再说",
    });
    expect(await rejected.json()).toMatchObject({
      request: { status: "rejected", rejectReason: "下个月再说" },
    });
    const again = await sendJson("POST", `/api/credit-requests/${rejectedId}/approve`, teacher);
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: "REQUEST_ALREADY_DECIDED" } });

    const withdrawnId = await create();
    const withdrawn = await sendJson(
      "POST",
      `/api/credit-requests/${withdrawnId}/withdraw`,
      student,
    );
    expect(await withdrawn.json()).toMatchObject({ request: { status: "withdrawn" } });

    const history = await (await getAs(path, student)).json<{ requests: { status: string }[] }>();
    expect(history.requests.map((r) => r.status)).toEqual(["withdrawn", "rejected"]);
  });

  it("申请的课时数必须是 1～100 的整数", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const path = `/api/relations/${relation.id}/credit-requests`;
    for (const amount of [0, 101, 1.5]) {
      expect((await sendJson("POST", path, student, { amount })).status).toBe(400);
    }
  });
});
