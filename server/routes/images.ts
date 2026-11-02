import { idParamSchema } from "@shared/schemas/common";
import { Hono } from "hono";
import { validate } from "../lib/validator";
import { loadCurrentUser, requireAuth, requireRegistered } from "../middleware/auth";
import { createImageService } from "../services/image-service";
import type { AppEnv } from "../types";

// 留言图片的读取：检查查看者能否查看这节课后，从 R2 读出返回（不提供公开链接）
// 上传在 POST /api/lessons/:id/images
export const imageRoutes = new Hono<AppEnv>()
  .use(requireAuth, loadCurrentUser, requireRegistered)
  .get("/:id", validate("param", idParamSchema), async (c) => {
    const { object, contentType } = await createImageService(c.get("db"), c.env.IMAGES).get(
      c.get("currentUser"),
      c.req.valid("param").id,
    );
    return c.body(object.body, 200, {
      "Content-Type": contentType,
      // 路径不会变，可以长期缓存；private 表示只能缓存在本人的手机上
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: object.httpEtag,
    });
  });
