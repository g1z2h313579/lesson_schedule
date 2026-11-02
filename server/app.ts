import { Hono } from "hono";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { dbMiddleware } from "./middleware/db";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health";
import { meRoutes } from "./routes/me";
import type { AppEnv } from "./types";

// 所有接口都挂在 /api 下（其余路径由静态资源 / 前端处理）
const app = new Hono<AppEnv>().basePath("/api");

// 全局中间件
app.use(requestId());
app.use(logger());
app.use(secureHeaders());
app.use(dbMiddleware);

// 全局错误处理
app.onError(errorHandler);
app.notFound(notFoundHandler);

// 路由注册：新增接口时，在 routes/ 下新建文件，再在这里追加 .route(...)
// 必须用链式写法，前端才能推断出完整的接口类型
const routes = app.route("/health", healthRoutes).route("/me", meRoutes);

// 供前端 Hono RPC 客户端使用的接口类型
export type AppType = typeof routes;

export { app };
