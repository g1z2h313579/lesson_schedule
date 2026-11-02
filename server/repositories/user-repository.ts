import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { users } from "../db/schema";
import type { LineUser } from "../lib/line/id-token";

// 用户表的数据访问（只负责读写数据库，不包含业务判断）
export function createUserRepository(db: Database) {
  return {
    findById(id: number) {
      return db.query.users.findFirst({ where: eq(users.id, id) });
    },

    findByLineUserId(lineUserId: string) {
      return db.query.users.findFirst({ where: eq(users.lineUserId, lineUserId) });
    },

    // 按 LINE userId 新增或更新用户（昵称、头像以 LINE 上的最新信息为准）
    async upsertFromLine(lineUser: LineUser) {
      const [user] = await db
        .insert(users)
        .values({
          lineUserId: lineUser.userId,
          displayName: lineUser.displayName,
          pictureUrl: lineUser.pictureUrl,
        })
        .onConflictDoUpdate({
          target: users.lineUserId,
          set: {
            displayName: lineUser.displayName,
            pictureUrl: lineUser.pictureUrl,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!user) {
        throw new Error("用户写入失败");
      }
      return user;
    },
  };
}
