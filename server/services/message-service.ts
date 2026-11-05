import type { CreateMessageValues } from "@shared/schemas/lesson";
import { type Database, runBatch } from "../db/client";
import type { NewMessageImage, User } from "../db/schema";
import { ApiError } from "../lib/errors";
import { createLessonRepository } from "../repositories/lesson-repository";
import { createMessageImageRepository } from "../repositories/message-image-repository";
import { createMessageRepository } from "../repositories/message-repository";
import { createUserRepository } from "../repositories/user-repository";
import { getPostableRelationOfLesson } from "./image-service";
import type { Notifier } from "./notifier";
import { getViewableRelation } from "./relation-access";

// 留言板：每节课一个。这节课的老师和学生可以发言（文字和图片），管理员只能查看
export function createMessageService(db: Database, bucket: R2Bucket, notifier: Notifier) {
  const lessonRepository = createLessonRepository(db);
  const messageRepository = createMessageRepository(db);
  const messageImageRepository = createMessageImageRepository(db);
  const userRepository = createUserRepository(db);

  // 取得课程所属的师生关系（看不到时返回 404）
  async function loadRelationOfLesson(user: User, lessonId: number) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson) throw new ApiError(404, "NOT_FOUND", "课程不存在");
    return getViewableRelation(db, user, lesson.teacherStudentId);
  }

  // 检查留言附带的图片：必须是这节课的路径、R2 中存在、而且是自己上传的
  async function verifyImages(user: User, lessonId: number, images: CreateMessageValues["images"]) {
    if (new Set(images.map((image) => image.key)).size !== images.length) {
      throw new ApiError(400, "VALIDATION_ERROR", "图片重复");
    }
    return Promise.all(
      images.map(async (image, index): Promise<Omit<NewMessageImage, "messageId">> => {
        const head = image.key.startsWith(`lessons/${lessonId}/`)
          ? await bucket.head(image.key)
          : null;
        if (!head || head.customMetadata?.uploaderId !== String(user.id)) {
          throw new ApiError(400, "VALIDATION_ERROR", "图片不存在");
        }
        return {
          r2Key: image.key,
          contentType: head.httpMetadata?.contentType ?? "image/jpeg",
          width: image.width,
          height: image.height,
          sizeBytes: head.size,
          sortOrder: index,
        };
      }),
    );
  }

  return {
    /** 一节课的留言（时间升序），附带发言人的名字和头像、图片、能否删除 */
    async list(user: User, lessonId: number) {
      await loadRelationOfLesson(user, lessonId);
      const messages = await messageRepository.listByLesson(lessonId);
      const [usersById, images] = await Promise.all([
        userRepository.findByIds(messages.map((m) => m.senderId)),
        messageImageRepository.listByMessageIds(messages.map((m) => m.id)),
      ]);
      return messages.map((message) => {
        const sender = usersById.get(message.senderId);
        return {
          id: message.id,
          type: message.type,
          body: message.body,
          createdAt: message.createdAt,
          sender: {
            id: message.senderId,
            name: sender ? (sender.name ?? sender.lineDisplayName) : "",
            pictureUrl: sender?.pictureUrl ?? null,
          },
          // 图片的宽高用于在加载出来之前先占好位置
          images: images
            .filter((image) => image.messageId === message.id)
            .map(({ id, width, height }) => ({ id, width, height })),
          // 只能删除自己发的普通留言（取消等记录不能删除）
          canDelete: message.senderId === user.id && message.type === "text",
        };
      });
    },

    /** 发留言（这节课的老师和学生）：文字和已上传的图片 */
    async create(user: User, lessonId: number, values: CreateMessageValues) {
      const relation = await getPostableRelationOfLesson(db, user, lessonId);
      const images = await verifyImages(user, lessonId, values.images);

      // D1 不能在一个事务中使用前一条语句的结果，所以分两步：先写留言，再写图片记录
      const [message] = await messageRepository.create({
        lessonId,
        senderId: user.id,
        type: "text",
        body: values.body,
      });
      if (!message) throw new Error("留言写入失败");
      try {
        await messageImageRepository.insertMany(
          images.map((image) => ({ ...image, messageId: message.id })),
        );
      } catch (error) {
        // 第二步失败时删除留言，恢复原状
        await messageRepository.deleteById(message.id);
        throw error;
      }
      await notifier.relationChanged(relation, user);
      return { id: message.id };
    },

    /** 删除自己发的普通留言，连同图片（数据库记录和 R2 中的文件）一起删除 */
    async remove(user: User, messageId: number) {
      const message = await messageRepository.findById(messageId);
      if (!message) throw new ApiError(404, "NOT_FOUND", "留言不存在");
      const relation = await loadRelationOfLesson(user, message.lessonId);
      if (message.senderId !== user.id || message.type !== "text") {
        throw new ApiError(403, "FORBIDDEN", "只能删除自己发的留言");
      }
      const images = await messageImageRepository.listByMessageIds([message.id]);
      await runBatch(db, [
        messageImageRepository.deleteByMessage(message.id),
        messageRepository.deleteById(message.id),
      ]);
      await notifier.relationChanged(relation, user);
      // 数据库中删除成功后再删除文件（删除文件失败时，剩下的文件也不会被看到）
      if (images.length > 0) await bucket.delete(images.map((image) => image.r2Key));
    },
  };
}
