import { z } from "zod";

// GET /api/hello 的查询参数
export const helloQuerySchema = z.object({
  name: z.string().trim().min(1).max(50).default("World"),
});

export type HelloQuery = z.input<typeof helloQuerySchema>;
