import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { invitations, teacherStudents } from "../db/schema";
import {
  createRegisteredUser,
  createRelation,
  createUser,
  getAs,
  sendJson,
  testDb,
} from "../test/factories";

type InvitationBody = { invitation: { code: string; expiresAt: string } };
type PreviewBody = { invitation: { status: string; inviter: { name: string; role: string } } };

// 以 inviter 的身份生成邀请码
async function createCode(inviter: { lineUserId: string }) {
  const res = await sendJson("POST", "/api/invitations", inviter);
  expect(res.status).toBe(200);
  return (await res.json<InvitationBody>()).invitation.code;
}

async function previewStatus(code: string, user: { lineUserId: string }) {
  const res = await getAs(`/api/invitations/${code}`, user);
  return (await res.json<PreviewBody>()).invitation.status;
}

describe("邀请", () => {
  it("生成 22 位的邀请码，7 天后过期", async () => {
    const teacher = await createRegisteredUser("teacher");
    const res = await sendJson("POST", "/api/invitations", teacher);
    const { invitation } = await res.json<InvitationBody>();
    expect(invitation.code).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const days = (new Date(invitation.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("未完成首次设置的用户也能查看邀请，看到邀请人的资料", async () => {
    const teacher = await createRegisteredUser("teacher", { name: "山田 花子" });
    const code = await createCode(teacher);
    const res = await getAs(`/api/invitations/${code}`, await createUser());
    expect(await res.json()).toMatchObject({
      invitation: { status: "valid", inviter: { name: "山田 花子", role: "teacher" } },
    });
  });

  it("查看邀请时返回各种状态：自己的邀请、身份相同、已过期、已使用", async () => {
    const teacher = await createRegisteredUser("teacher");
    const code = await createCode(teacher);
    expect(await previewStatus(code, teacher)).toBe("self");
    expect(await previewStatus(code, await createRegisteredUser("teacher"))).toBe("same_role");

    const expiredCode = await createCode(teacher);
    await testDb()
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitations.code, expiredCode));
    expect(await previewStatus(expiredCode, await createRegisteredUser("student"))).toBe("expired");

    await sendJson(
      "POST",
      `/api/invitations/${code}/accept`,
      await createRegisteredUser("student"),
    );
    expect(await previewStatus(code, await createRegisteredUser("student"))).toBe("used");
  });

  it("老师的邀请被学生接受后，建立师生关系", async () => {
    const teacher = await createRegisteredUser("teacher");
    const student = await createRegisteredUser("student");
    const res = await sendJson(
      "POST",
      `/api/invitations/${await createCode(teacher)}/accept`,
      student,
    );
    expect(res.status).toBe(200);
    const { relationId } = await res.json<{ relationId: number }>();
    const relation = await testDb().query.teacherStudents.findFirst({
      where: eq(teacherStudents.id, relationId),
    });
    expect(relation).toMatchObject({ teacherId: teacher.id, studentId: student.id });
  });

  it("学生也可以邀请老师", async () => {
    const teacher = await createRegisteredUser("teacher");
    const student = await createRegisteredUser("student");
    const res = await sendJson(
      "POST",
      `/api/invitations/${await createCode(student)}/accept`,
      teacher,
    );
    const { relationId } = await res.json<{ relationId: number }>();
    const relation = await testDb().query.teacherStudents.findFirst({
      where: eq(teacherStudents.id, relationId),
    });
    expect(relation).toMatchObject({ teacherId: teacher.id, studentId: student.id });
  });

  it.each([
    ["同一个邀请码第二次接受", "INVITATION_USED"],
    ["老师之间", "INVITATION_SAME_ROLE"],
    ["自己的邀请", "INVITATION_SELF"],
    ["两人已经关联", "ALREADY_LINKED"],
  ])("%s时不能接受（%s）", async (scenario, code) => {
    const teacher = await createRegisteredUser("teacher");
    const invitationCode = await createCode(teacher);
    let acceptor = await createRegisteredUser("student");
    if (scenario === "同一个邀请码第二次接受") {
      await sendJson("POST", `/api/invitations/${invitationCode}/accept`, acceptor);
      acceptor = await createRegisteredUser("student");
    } else if (scenario === "老师之间") {
      acceptor = await createRegisteredUser("teacher");
    } else if (scenario === "自己的邀请") {
      acceptor = teacher;
    } else {
      await createRelation(teacher, acceptor);
    }
    const res = await sendJson("POST", `/api/invitations/${invitationCode}/accept`, acceptor);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code } });
  });

  it("未完成首次设置时不能接受（403），邀请码不存在时返回 404", async () => {
    const code = await createCode(await createRegisteredUser("teacher"));
    const unregistered = await createUser();
    expect((await sendJson("POST", `/api/invitations/${code}/accept`, unregistered)).status).toBe(
      403,
    );
    expect((await getAs("/api/invitations/not-exists", unregistered)).status).toBe(404);
  });
});
