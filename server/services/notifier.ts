import type { Database } from "../db/client";
import type { TeacherStudent, User } from "../db/schema";
import { type NotificationHub, notificationChannel } from "../durable-objects/notification-hub";
import { createRelationRepository } from "../repositories/relation-repository";
import { createUserRepository } from "../repositories/user-repository";

/**
 * 实时通知：数据有变化时，让相关用户打开着的画面自动重新加载。
 * - 只通知「有变化」，不发送内容（画面收到后通过各接口重新取得数据，权限检查不变）。
 * - 管理员能看到所有关系，所以每次都通知。
 * - 做出操作的人自己的画面在操作后已经重新加载，不再通知。
 * - 通知失败不影响操作本身，只记录日志。
 */
export function createNotifier(db: Database, hub: DurableObjectNamespace<NotificationHub>) {
  const userRepository = createUserRepository(db);
  const relationRepository = createRelationRepository(db);

  async function notifyUsers(
    loadUserIds: () => Promise<number[]>,
    actor: User | null,
  ): Promise<void> {
    try {
      const [userIds, adminIds] = await Promise.all([loadUserIds(), userRepository.listAdminIds()]);
      const targets = new Set([...userIds, ...adminIds]);
      if (actor) targets.delete(actor.id);
      const results = await Promise.allSettled(
        [...targets].map((id) => hub.getByName(notificationChannel(id)).notify()),
      );
      for (const result of results) {
        if (result.status === "rejected") console.error("[realtime] 通知失败", result.reason);
      }
    } catch (error) {
      console.error("[realtime] 通知失败", error);
    }
  }

  return {
    /**
     * 师生关系中的数据有变化（建立关联、课时申请、排课、取消、改时间、留言）：通知双方。
     * actor 为做出操作的人；定时任务等没有操作人时传 null。
     */
    relationChanged(relation: TeacherStudent, actor: User | null) {
      return notifyUsers(async () => [relation.teacherId, relation.studentId], actor);
    },

    /** 用户的资料（名字、自我介绍）有变化：通知所有关联的人 */
    profileChanged(user: User) {
      return notifyUsers(async () => {
        const relations = await relationRepository.list(user.id);
        return relations.flatMap((relation) => [relation.teacherId, relation.studentId]);
      }, user);
    },
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
