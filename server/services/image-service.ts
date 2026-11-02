import { IMAGE_CONTENT_TYPES, IMAGE_MAX_BYTES } from "@shared/constants/message";
import type { Database } from "../db/client";
import type { User } from "../db/schema";
import { isRelationStudent, isRelationTeacher } from "../lib/access";
import { ApiError } from "../lib/errors";
import { createLessonRepository } from "../repositories/lesson-repository";
import { createMessageImageRepository } from "../repositories/message-image-repository";
import { createMessageRepository } from "../repositories/message-repository";
import { getViewableRelation } from "./relation-access";

// 文件的扩展名
const EXTENSIONS: Record<(typeof IMAGE_CONTENT_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// 上传后超过这个时间还没发出去（不在数据库中）的图片，由定时任务删除
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

function isAllowedContentType(value: string): value is (typeof IMAGE_CONTENT_TYPES)[number] {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/** 这节课所属的师生关系中，用户能否发留言（老师和学生能，管理员不能） */
export async function getPostableRelationOfLesson(db: Database, user: User, lessonId: number) {
  const lesson = await createLessonRepository(db).findById(lessonId);
  if (!lesson) throw new ApiError(404, "NOT_FOUND", "课程不存在");
  const relation = await getViewableRelation(db, user, lesson.teacherStudentId);
  if (!isRelationTeacher(user, relation) && !isRelationStudent(user, relation)) {
    throw new ApiError(403, "FORBIDDEN", "只有这节课的老师和学生能留言");
  }
  return relation;
}

// 留言图片：上传到 R2、在检查权限后读取、清理没发出去的图片
// 图片不公开，R2 中的路径为 lessons/<课程 id>/<随机 ID>.<扩展名>
export function createImageService(db: Database, bucket: R2Bucket) {
  const messageRepository = createMessageRepository(db);
  const messageImageRepository = createMessageImageRepository(db);
  const lessonRepository = createLessonRepository(db);

  return {
    /**
     * 上传 1 张图片：请求体就是图片本身，直接流式写入 R2（不在 Worker 中解析，几乎不占 CPU 时间）。
     * 返回 R2 中的路径，发留言时带上这个路径。
     */
    async upload(
      user: User,
      lessonId: number,
      file: { body: ReadableStream | null; contentType: string; contentLength: number },
    ) {
      await getPostableRelationOfLesson(db, user, lessonId);
      const contentType = file.contentType.split(";")[0]?.trim() ?? "";
      if (!isAllowedContentType(contentType)) {
        throw new ApiError(400, "VALIDATION_ERROR", "不支持的图片格式");
      }
      if (!file.body || !(file.contentLength > 0) || file.contentLength > IMAGE_MAX_BYTES) {
        throw new ApiError(400, "VALIDATION_ERROR", "图片为空或太大");
      }

      const key = `lessons/${lessonId}/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
      const object = await bucket.put(key, file.body, {
        httpMetadata: { contentType },
        // 记下上传人：发留言时只能使用自己上传的图片
        customMetadata: { uploaderId: String(user.id) },
      });
      if (object.size > IMAGE_MAX_BYTES) {
        await bucket.delete(key);
        throw new ApiError(400, "VALIDATION_ERROR", "图片太大");
      }
      return { key };
    },

    /** 读取图片：查看者必须能查看这节课（双方或管理员） */
    async get(user: User, imageId: number) {
      const image = await messageImageRepository.findById(imageId);
      const message = image && (await messageRepository.findById(image.messageId));
      const lesson = message && (await lessonRepository.findById(message.lessonId));
      if (!image || !lesson) throw new ApiError(404, "NOT_FOUND", "图片不存在");
      await getViewableRelation(db, user, lesson.teacherStudentId);
      const object = await bucket.get(image.r2Key);
      if (!object) throw new ApiError(404, "NOT_FOUND", "图片文件不存在");
      return { object, contentType: image.contentType };
    },

    /** 定时任务：删除上传超过 24 小时、但没有发出去（不在数据库中）的图片，返回删除的张数 */
    async cleanupOrphans(now: Date) {
      let deleted = 0;
      let cursor: string | undefined;
      do {
        const page = await bucket.list({ prefix: "lessons/", cursor, limit: 500 });
        const old = page.objects
          .filter((object) => object.uploaded.getTime() < now.getTime() - ORPHAN_TTL_MS)
          .map((object) => object.key);
        const existing = await messageImageRepository.existingKeys(old);
        const orphans = old.filter((key) => !existing.has(key));
        if (orphans.length > 0) {
          await bucket.delete(orphans);
          deleted += orphans.length;
        }
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return deleted;
    },
  };
}
