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
    // 取不到昵称时（用户未同意 profile 权限），新用户的昵称存为空字符串，已有用户保留原来的昵称和头像
    async upsertFromLine(lineUser: LineUser) {
      const profile =
        lineUser.displayName === null
          ? null
          : { displayName: lineUser.displayName, pictureUrl: lineUser.pictureUrl };

      const [user] = await db
        .insert(users)
        .values({
          lineUserId: lineUser.userId,
          displayName: profile?.displayName ?? "",
          pictureUrl: profile?.pictureUrl ?? null,
        })
        .onConflictDoUpdate({
          target: users.lineUserId,
          set: { ...profile, updatedAt: new Date() },
        })
        .returning();

      if (!user) {
        throw new Error("用户写入失败");
      }
      return user;
    },
  };
}
