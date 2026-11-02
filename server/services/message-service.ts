import type { Database } from "../db/client";
import type { User } from "../db/schema";
import { isRelationStudent, isRelationTeacher } from "../lib/access";
import { ApiError } from "../lib/errors";
import { createLessonRepository } from "../repositories/lesson-repository";
import { createMessageRepository } from "../repositories/message-repository";
import { createUserRepository } from "../repositories/user-repository";
import { getViewableRelation } from "./relation-access";

// 留言板：每节课一个。这节课的老师和学生可以发言，管理员只能查看
export function createMessageService(db: Database) {
  const lessonRepository = createLessonRepository(db);
  const messageRepository = createMessageRepository(db);
  const userRepository = createUserRepository(db);

  // 取得课程所属的师生关系（看不到时返回 404）
  async function loadRelationOfLesson(user: User, lessonId: number) {
    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson) throw new ApiError(404, "NOT_FOUND", "课程不存在");
    return getViewableRelation(db, user, lesson.teacherStudentId);
  }

  return {
    /** 一节课的留言（时间升序），附带发言人的名字和头像、能否删除 */
    async list(user: User, lessonId: number) {
      await loadRelationOfLesson(user, lessonId);
      const messages = await messageRepository.listByLesson(lessonId);
      const usersById = await userRepository.findByIds(messages.map((m) => m.senderId));
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
          // 只能删除自己发的普通留言（请假等记录不能删除）
          canDelete: message.senderId === user.id && message.type === "text",
        };
      });
    },

    /** 发留言（这节课的老师和学生） */
    async create(user: User, lessonId: number, body: string) {
      const relation = await loadRelationOfLesson(user, lessonId);
      if (!isRelationTeacher(user, relation) && !isRelationStudent(user, relation)) {
        throw new ApiError(403, "FORBIDDEN", "只有这节课的老师和学生能留言");
      }
      const [message] = await messageRepository.create({
        lessonId,
        senderId: user.id,
        type: "text",
        body,
      });
      if (!message) throw new Error("留言写入失败");
      return { id: message.id };
    },

    /** 删除自己发的普通留言 */
    async remove(user: User, messageId: number) {
      const message = await messageRepository.findById(messageId);
      if (!message) throw new ApiError(404, "NOT_FOUND", "留言不存在");
      await loadRelationOfLesson(user, message.lessonId);
      if (message.senderId !== user.id || message.type !== "text") {
        throw new ApiError(403, "FORBIDDEN", "只能删除自己发的留言");
      }
      await messageRepository.deleteById(message.id);
    },
  };
}
