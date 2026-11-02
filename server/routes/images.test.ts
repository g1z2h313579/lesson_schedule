import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { app } from "../app";
import { createImageService } from "../services/image-service";
import {
  authHeaders,
  createLesson,
  createRegisteredUser,
  createTeacherAndStudent,
  getAs,
  jstSlot,
  sendJson,
  testDb,
} from "../test/factories";

// 测试用的「图片」内容（只检查能否原样存取，不需要是真正的图片）
const IMAGE_BYTES = new TextEncoder().encode("fake-jpeg-content");

// 以某个用户的身份上传 1 张图片
function upload(
  lessonId: number,
  user: { lineUserId: string },
  options: { contentType?: string; body?: Uint8Array } = {},
) {
  const body = options.body ?? IMAGE_BYTES;
  return app.request(
    `/api/lessons/${lessonId}/images`,
    {
      method: "POST",
      headers: {
        ...authHeaders(user),
        "Content-Type": options.contentType ?? "image/jpeg",
        "Content-Length": String(body.byteLength),
      },
      body,
    },
    env,
  );
}

async function uploadKey(lessonId: number, user: { lineUserId: string }) {
  const res = await upload(lessonId, user);
  expect(res.status).toBe(200);
  return (await res.json<{ key: string }>()).key;
}

type MessagesBody = { messages: { id: number; images: { id: number; width: number }[] }[] };

describe("图片留言", () => {
  it("上传图片后随留言发出，双方和管理员能看到图片，其他人看不到", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(-1, 10));
    const key = await uploadKey(lesson.id, teacher);
    expect(key).toMatch(new RegExp(`^lessons/${lesson.id}/[0-9a-f-]+\\.jpg$`));

    const posted = await sendJson("POST", `/api/lessons/${lesson.id}/messages`, teacher, {
      images: [{ key, width: 1200, height: 900 }],
    });
    expect(posted.status).toBe(200);

    const list = await (
      await getAs(`/api/lessons/${lesson.id}/messages`, student)
    ).json<MessagesBody>();
    const image = list.messages[0]?.images[0];
    expect(image).toMatchObject({ width: 1200, height: 900 });
    if (!image) throw new Error("没有图片");

    const res = await getAs(`/api/images/${image.id}`, student);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(IMAGE_BYTES);

    const admin = await createRegisteredUser("student", { isAdmin: true });
    expect((await getAs(`/api/images/${image.id}`, admin)).status).toBe(200);
    const outsider = await createRegisteredUser("student");
    expect((await getAs(`/api/images/${image.id}`, outsider)).status).toBe(404);
  });

  it("不能上传的情况：格式不对、太大、管理员", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(1, 10));
    expect((await upload(lesson.id, student, { contentType: "application/pdf" })).status).toBe(400);
    expect(
      (await upload(lesson.id, student, { body: new Uint8Array(5 * 1024 * 1024 + 1) })).status,
    ).toBe(400);
    const admin = await createRegisteredUser("student", { isAdmin: true });
    expect((await upload(lesson.id, admin)).status).toBe(403);
  });

  it("发留言时只能使用自己为这节课上传的图片", async () => {
    const { teacher, student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(1, 10));
    const otherLesson = await createLesson(relation, jstSlot(2, 10));
    const path = `/api/lessons/${lesson.id}/messages`;

    const otherLessonKey = await uploadKey(otherLesson.id, student);
    const teachersKey = await uploadKey(lesson.id, teacher);
    for (const key of [otherLessonKey, teachersKey, `lessons/${lesson.id}/not-exists.jpg`]) {
      const res = await sendJson("POST", path, student, {
        images: [{ key, width: 10, height: 10 }],
      });
      expect(res.status).toBe(400);
    }
  });

  it("文字和图片都没有时不能发；最多 9 张", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(1, 10));
    const path = `/api/lessons/${lesson.id}/messages`;
    expect((await sendJson("POST", path, student, { body: "", images: [] })).status).toBe(400);
    const images = Array.from({ length: 10 }, (_, i) => ({ key: `k${i}`, width: 1, height: 1 }));
    expect((await sendJson("POST", path, student, { images })).status).toBe(400);
  });

  it("删除留言时，R2 中的图片文件也一起删除", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(1, 10));
    const key = await uploadKey(lesson.id, student);
    const { message } = await (
      await sendJson("POST", `/api/lessons/${lesson.id}/messages`, student, {
        body: "教材的截图",
        images: [{ key, width: 10, height: 10 }],
      })
    ).json<{ message: { id: number } }>();

    expect(await env.IMAGES.head(key)).not.toBeNull();
    expect((await sendJson("DELETE", `/api/messages/${message.id}`, student)).status).toBe(200);
    expect(await env.IMAGES.head(key)).toBeNull();
    const rows = await testDb().query.messageImages.findMany();
    expect(rows.some((row) => row.r2Key === key)).toBe(false);
  });

  it("定时任务删除上传超过 24 小时、但没有发出去的图片", async () => {
    const { student, relation } = await createTeacherAndStudent();
    const lesson = await createLesson(relation, jstSlot(1, 10));
    const sentKey = await uploadKey(lesson.id, student);
    const orphanKey = await uploadKey(lesson.id, student);
    await sendJson("POST", `/api/lessons/${lesson.id}/messages`, student, {
      images: [{ key: sentKey, width: 10, height: 10 }],
    });

    const service = createImageService(testDb(), env.IMAGES);
    // 刚上传的还不到 24 小时，不删除
    await service.cleanupOrphans(new Date());
    expect(await env.IMAGES.head(orphanKey)).not.toBeNull();

    await service.cleanupOrphans(new Date(Date.now() + 25 * 60 * 60 * 1000));
    expect(await env.IMAGES.head(orphanKey)).toBeNull();
    expect(await env.IMAGES.head(sentKey)).not.toBeNull();
  });
});
