import { integer } from "drizzle-orm/sqlite-core";

// 各表通用的时间戳列（以 UTC 毫秒时间戳保存，显示时再按时区换算）
export const timestamps = {
  createdAt: integer({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};
