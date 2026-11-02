import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createDb } from "../db/client";
import { createUserRepository } from "./user-repository";

describe("userRepository.upsertFromLine", () => {
  it("取不到昵称时，新用户的昵称为空字符串", async () => {
    const repo = createUserRepository(createDb(env.DB));
    const user = await repo.upsertFromLine({
      userId: "U_new",
      displayName: null,
      pictureUrl: null,
    });
    expect(user).toMatchObject({ lineUserId: "U_new", displayName: "", pictureUrl: null });
  });

  it("取不到昵称时，不覆盖已有用户的昵称和头像", async () => {
    const repo = createUserRepository(createDb(env.DB));
    await repo.upsertFromLine({
      userId: "U_keep",
      displayName: "山田",
      pictureUrl: "https://example.com/a.png",
    });

    const user = await repo.upsertFromLine({
      userId: "U_keep",
      displayName: null,
      pictureUrl: null,
    });
    expect(user).toMatchObject({ displayName: "山田", pictureUrl: "https://example.com/a.png" });
  });
});
