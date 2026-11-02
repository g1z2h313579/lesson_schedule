import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { invitations, type NewInvitation } from "../db/schema";

// 邀请表的数据访问
export function createInvitationRepository(db: Database) {
  return {
    async create(values: NewInvitation) {
      const [invitation] = await db.insert(invitations).values(values).returning();
      if (!invitation) throw new Error("邀请写入失败");
      return invitation;
    },

    findByCode(code: string) {
      return db.query.invitations.findFirst({ where: eq(invitations.code, code) });
    },

    // 标记为已使用：只在还没被使用时更新（两人同时接受时只有一人成功），失败时返回 undefined
    async markAccepted(id: number, userId: number, now: Date) {
      const [invitation] = await db
        .update(invitations)
        .set({ acceptedById: userId, acceptedAt: now })
        .where(and(eq(invitations.id, id), isNull(invitations.acceptedById)))
        .returning();
      return invitation;
    },
  };
}
