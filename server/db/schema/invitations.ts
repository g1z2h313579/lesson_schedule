import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns";
import { users } from "./users";

// 邀请：通过 LINE 好友选择画面发出的邀请卡片中带有邀请码
// 邀请人的身份看 users.role，被邀请人必须是相反的身份
export const invitations = sqliteTable(
  "invitations",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    // 邀请码：随机生成，放在邀请链接中
    code: text().notNull().unique(),
    inviterId: integer()
      .notNull()
      .references(() => users.id),
    // 有效期限（创建后 7 天）
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    // 接受邀请的人：为空表示还没被使用（每个邀请码只能使用 1 次）
    acceptedById: integer().references(() => users.id),
    acceptedAt: integer({ mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("invitations_inviter_idx").on(t.inviterId)],
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
