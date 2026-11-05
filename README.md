# 课程管理（LINE MINI App）

管理日语课程的 LINE MINI App，老师和学生都在 LINE 中使用。页面支持日语和中文。

主要功能：

- **首次设置**：选择身份（老师 / 学生），填写名字和自我介绍
- **邀请**：用 LINE 的好友选择画面发送邀请卡片，对方接受后建立师生关系（只能老师和学生之间关联）
- **课时**：学生申请增加课时，老师确认或拒绝（不涉及交易）
- **排课**：老师或学生设置每周课程（每天日本时间 0:00 自动补排，每月最后一天排好下个月）或添加单次课程
- **课程表**：月历、下一节课、取消和改时间（老师和学生相同）
- **留言板**：每节课一个，可以发文字和图片（图片存在 Cloudflare R2，不公开）
- **实时更新**：小程序开着的时候，对方的操作（排课、取消、留言、课时申请等）几秒内自动显示，不需要刷新
- **管理员**：可以查看所有师生关系（只能查看）

需求、数据库设计、各阶段的施工方案见 [docs/](docs/)。

## 技术栈

| 部分            | 技术                                                                                    |
| --------------- | --------------------------------------------------------------------------------------- |
| 前端            | React 19 + Vite + Tailwind CSS v4 + shadcn/ui + React Router + TanStack Query + i18next |
| LINE            | LIFF SDK（本地开发使用 LIFF Mock）                                                      |
| 后端            | Hono（运行在 Cloudflare Workers）                                                       |
| 数据库          | Cloudflare D1（SQLite）+ Drizzle ORM                                                    |
| 图片存储        | Cloudflare R2（存储桶 `lesson-schedule-images`，不公开）                                |
| 实时更新        | Cloudflare Durable Objects（WebSocket，Hibernation API）                                |
| 参数校验        | Zod（前后端共用）                                                                       |
| 测试 / 代码检查 | Vitest（在 Workers 运行时中执行）/ Biome / TypeScript                                   |
| 部署            | Cloudflare Workers Builds（推送到 GitHub 后自动部署）                                   |

前端和后端部署在**同一个 Worker** 中：`/api/*` 交给 Hono 处理，其余路径返回前端页面。

## 目录结构

```
├── web/                     # 前端
│   ├── index.html
│   └── src/
│       ├── main.tsx         # 入口：初始化多语言 → 初始化 LIFF → 渲染
│       ├── app.tsx          # 全局 Provider（TanStack Query、路由）
│       ├── router.tsx       # 路由表（新增页面在这里注册）
│       ├── api/             # 调用后端接口的 hooks（client.ts 为类型安全的 API 客户端）
│       ├── pages/           # 页面组件
│       ├── layouts/         # 布局组件
│       ├── components/      # 通用组件（ui/ 为 shadcn 组件）
│       ├── i18n/            # 多语言（locales/zh.ts、ja.ts）
│       ├── hooks/           # 通用的 React hooks
│       ├── lib/             # LIFF、QueryClient、日期格式、邀请卡片、图片压缩等工具
│       └── styles/          # 全局样式（主题、字号）
├── server/                  # 后端（Cloudflare Worker）
│   ├── index.ts             # Worker 入口（HTTP 请求 + 定时任务）
│   ├── app.ts               # Hono 应用：中间件、错误处理、路由注册
│   ├── routes/              # 接口（每个文件一组接口，*.test.ts 为对应测试）
│   ├── services/            # 业务逻辑
│   ├── repositories/        # 数据库读写（Drizzle）
│   ├── db/                  # 数据库连接与表定义（schema/）
│   ├── middleware/          # 中间件（数据库注入、登录校验、错误处理）
│   ├── lib/                 # 工具（错误类型、参数校验、LINE 接口）
│   ├── durable-objects/     # Durable Object（实时更新的通知中心，每个用户一个实例）
│   ├── jobs/                # 定时任务（每天补排课程、清理没发出去的图片）
│   └── test/                # 测试初始化、测试数据的生成工具（factories.ts）
├── shared/                  # 前后端共用（常量、Zod schema、类型、日本时间的计算）
├── drizzle/migrations/      # 数据库迁移文件（由 drizzle-kit 生成）
├── scripts/                 # 本地开发用的脚本（测试数据）
├── docs/                    # 需求文档、数据库设计、施工方案
├── wrangler.jsonc           # Cloudflare Worker 配置（D1、R2、Durable Objects、环境变量、定时任务）
├── vite.config.ts           # 前端构建 + 本地运行后端
├── vitest.config.ts         # 后端测试配置
└── drizzle.config.ts        # 迁移生成配置
```

请求的处理流程：

```
页面 → api/*.ts（hooks）→ /api/xxx → routes → services → repositories → D1
                                                 ├→ R2（留言图片）
                                                 └→ 通知中心（Durable Object）→ 对方的画面（WebSocket）→ 重新加载
```

## 本地开发

需要 Node.js 22 和 pnpm 10。本地开发**不需要 Cloudflare 账号，也不需要 LINE**。

```bash
pnpm install
cp .dev.vars.example .dev.vars   # 后端本地环境变量
pnpm db:reset:local              # 创建本地数据库的表，并写入测试数据
pnpm dev                         # 启动 http://localhost:5173
```

打开后会以「模拟老师」的身份登录。页面顶部的下拉框可以切换模拟用户（老师、学生、管理员、未注册的新用户），切换后页面会重新加载。

### 常用命令

| 命令                                                                     | 作用                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `pnpm dev`                                                               | 启动开发服务器（前端和后端一起热更新）                   |
| `pnpm test`                                                              | 运行后端测试                                             |
| `pnpm typecheck`                                                         | 类型检查（前端、后端、配置文件）                         |
| `pnpm lint` / `pnpm lint:fix`                                            | 代码检查 / 自动修复和格式化                              |
| `pnpm build`                                                             | 类型检查 + 生产构建                                      |
| `pnpm db:generate --name <名称>`                                         | 根据表定义生成迁移文件                                   |
| `pnpm db:migrate:local`                                                  | 把迁移应用到本地数据库                                   |
| `pnpm db:migrate:remote`                                                 | 把迁移应用到线上数据库                                   |
| `pnpm db:seed:local`                                                     | 向本地数据库写入测试数据（`scripts/seed-local.sql`）     |
| `pnpm db:reset:local`                                                    | 清空本地数据库，重新建表并写入测试数据                   |
| `pnpm cf-typegen`                                                        | 修改 wrangler.jsonc 或 .dev.vars 后，重新生成 `Env` 类型 |
| `pnpm wrangler d1 execute DB --local --command "select * from users"`    | 查询本地数据库                                           |
| `curl "http://localhost:5173/cdn-cgi/handler/scheduled?cron=0+15+*+*+*"` | 手动触发每天的定时任务（补排课程、清理图片）             |

### 登录（LIFF）的本地调试

- **默认（浏览器）**：`.env.development` 中 `VITE_LIFF_MOCK=true`，前端使用 LIFF Mock，后端 `AUTH_MOCK=true` 时不校验 token，直接使用模拟用户。
  想切换模拟用户时，使用页面顶部的下拉框（模拟用户的列表在 `web/src/lib/mock-user.ts`，与测试数据对应）。
- **手机真机（在 LINE 中打开）**：
  1. 新建 `.env.development.local`，写入 `VITE_LIFF_MOCK=false` 和 `VITE_LIFF_ID=2012328071-SkVWvCN2`（Developing 版本）；`.dev.vars` 中改为 `AUTH_MOCK=false`、`LINE_CHANNEL_ID=2012328071`
  2. `cloudflared tunnel --url http://localhost:5173` 生成临时 HTTPS 地址
  3. 把这个地址填到 LINE Developers 控制台 MINI App 渠道 **Developing** 版本的 Endpoint URL（Published 版本保持线上地址，不受影响）
  4. 在 LINE 中打开 `https://miniapp.line.me/2012328071-SkVWvCN2`

## 如何扩展

### 新增页面

1. 在 `web/src/pages/` 下新建页面组件
2. 在 `web/src/router.tsx` 的 `children` 中注册路由
3. 页面文字写在 `web/src/i18n/locales/zh.ts` 和 `ja.ts` 中（两边结构必须一致，否则会报类型错误），用 `t("键名")` 显示

### 新增接口

1. 如果有请求参数，在 `shared/schemas/` 下用 Zod 定义（前端也能复用）
2. 在 `server/routes/` 下新建路由文件，参数用 `validate("query" | "json" | "param", schema)` 校验；需要登录的接口加上 `.use(requireAuth)`
3. 业务逻辑写在 `server/services/`，数据库读写写在 `server/repositories/`
4. 在 `server/app.ts` 中追加 `.route("/xxx", xxxRoutes)`（必须链式写法）
5. 前端在 `web/src/api/` 下用 `api.xxx.$get()` 调用，参数和返回值类型自动来自后端
6. 出错时抛出 `new ApiError(状态码, 错误码, 说明)`，会统一返回 `{ error: { code, message } }`；前端按错误码显示对应语言的提示

### 新增数据表 / 修改表结构

1. 在 `server/db/schema/` 下新建或修改表定义，并在 `schema/index.ts` 中导出
2. `pnpm db:generate --name <这次修改的名称>` 生成迁移文件（会提交到 git）
3. `pnpm db:migrate:local` 应用到本地数据库
4. 部署时会自动应用到线上数据库

> 时间统一以 UTC 毫秒时间戳保存（见 `schema/columns.ts`），显示时再按时区换算。

## 环境变量

| 位置                               | 变量                                  | 说明                                             |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------ |
| `wrangler.jsonc` → `vars`          | `APP_ENV`                             | 运行环境（production / development / test）      |
|                                    | `AUTH_MOCK`                           | 是否使用模拟用户（生产环境即使设为 true 也无效） |
|                                    | `LINE_CHANNEL_ID`                     | MINI App 渠道的 Channel ID（校验 ID token 用）   |
| 密钥（`pnpm wrangler secret put`） | `LINE_CHANNEL_ACCESS_TOKEN`           | 官方账号 Messaging API 的令牌（推送提醒用）      |
| `.dev.vars`                        | 同上                                  | 本地开发时覆盖以上变量（不提交到 git）           |
| `.env`                             | `VITE_LIFF_ID`                        | LIFF ID（会打包进前端代码，不能放密钥）          |
| `.env.development`                 | `VITE_LIFF_MOCK`、`VITE_MOCK_USER_ID` | 本地开发用                                       |
| `wrangler.jsonc` → `r2_buckets`    | `IMAGES`                              | 留言图片的 R2 存储桶（本地开发时使用模拟的 R2）  |

## 首次部署

> 以下步骤只需做一次。D1 数据库已创建（`database_id` 已写入 `wrangler.jsonc`），线上地址为 `https://lesson-schedule.gzhforever1994.workers.dev`。

1. **登录 Cloudflare 并创建 D1 数据库**（已完成）

   ```bash
   pnpm wrangler login
   pnpm wrangler d1 create lesson-schedule --location apac
   ```

   把输出的 `database_id` 填到 `wrangler.jsonc`，然后执行一次 `pnpm deploy:all` 从本地手动部署。

2. **创建给 Workers Builds 用的 API 令牌**

   Workers Builds 自动生成的令牌**没有 D1 权限**，部署命令里的 `pnpm db:migrate:remote` 会失败，所以要自己建一个：
   - Cloudflare 控制台右上角头像 → Profile → API Tokens → Create Token
   - 选模板 **Edit Cloudflare Workers**，在 Permissions 里追加一行 `Account` / `D1` / `Edit`
   - Account Resources 选自己的账号，Zone Resources 选 All zones，创建

3. **Workers Builds 设置**（Worker → Settings → Build）

   | 项目           | 值                                             |
   | -------------- | ---------------------------------------------- |
   | Git repository | `g1z2h313579/lesson_schedule`，分支 `main`     |
   | Build command  | `pnpm build`                                   |
   | Deploy command | `pnpm db:migrate:remote && pnpm deploy:worker` |
   | API token      | 第 2 步创建的令牌                              |

   之后推送到 `main` 分支就会自动部署。也可以在本地执行 `pnpm deploy:all` 手动部署。
   - Deploy command **不能用默认的 `npx wrangler deploy`**：前端在 `web/` 目录下，必须用 `pnpm deploy:worker` 指定构建生成的配置
   - 非生产分支的预览构建用不到。只往 `main` 推送就不会触发，不关闭也没关系

4. **R2 存储桶**（已完成）

   ```bash
   pnpm wrangler r2 bucket create lesson-schedule-images --location apac
   ```

   如果部署时报错没有 R2 权限，在第 2 步的令牌中追加 `Account` / `Workers R2 Storage` / `Edit`。

5. **LINE 设置**（已完成，线上使用 Published 版本）
   - 在 LINE Developers 控制台创建 MINI App 渠道，开启 `openid` scope，Endpoint URL 填上面的线上地址
   - MINI App 渠道内部分为三个版本，各有自己的 Channel ID 和 LIFF ID：

     | 版本       | Channel ID   | 用途                                                   |
     | ---------- | ------------ | ------------------------------------------------------ |
     | Developing | `2012328071` | 手机真机调试本地代码（只有渠道管理员和测试人员能打开） |
     | Review     | `2012328072` | 提交审核用                                             |
     | Published  | `2012328073` | 线上正式版，LIFF ID 为 `2012328073-CQRS3G0i`           |

   - 把 LIFF ID 填到 `.env` 的 `VITE_LIFF_ID`，**同一版本**的 Channel ID 填到 `wrangler.jsonc` 的 `LINE_CHANNEL_ID`，推送后自动部署。两者不一致时登录会返回 401
   - 线上地址：`https://miniapp.line.me/2012328073-CQRS3G0i`（把这个链接发给老师即可）
   - 首次打开时 LINE 会显示验证画面，同意后才能取得 LINE 名字和头像
   - 邀请功能使用 shareTargetPicker，需要在渠道的 LIFF 设置中开启（已开启）
   - 需要推送提醒时：`pnpm wrangler secret put LINE_CHANNEL_ACCESS_TOKEN`

## 日常操作

- **设置管理员**：管理员不能在画面上设置，由开发者直接修改线上数据库（先查出用户的 id）

  ```bash
  pnpm wrangler d1 execute DB --remote --command "SELECT id, name, role, is_admin FROM users"
  pnpm wrangler d1 execute DB --remote --command "UPDATE users SET is_admin = 1 WHERE id = <id>"
  ```

- **修改身份**（用户选错老师 / 学生时）：`UPDATE users SET role = 'teacher' WHERE id = <id>`
- **定时任务**：每天 UTC 15:00（日本时间 0:00）执行，按每周课程补排课程，并删除上传超过 24 小时但没发出去的图片。执行结果在 Cloudflare 控制台的 Workers Logs 中查看
- **查看日志**：Cloudflare 控制台 → Workers → lesson-schedule → Logs

## 注意事项

- 本项目没有测试环境，**数据库迁移会直接作用于线上数据**。改表时尽量做到新旧代码都能兼容（例如先加新列，下个版本再删旧列）。出问题时可以用 D1 的 Time Travel 恢复到过去的时间点。
- 面向老年用户：`web/src/styles/globals.css` 中把根字号设为 112.5%（18px），所有字号、间距、按钮会一起放大。再大的话，手机上日期等文字容易折行。
- 画面样式：手机应用的风格（浅灰底 + 白色圆角卡片，主题色为青绿色）。配色都写在 `globals.css` 的 `:root` 中，状态色（`info` / `success` / `warning` / `danger`）用于课程状态和课时申请状态。
  - 页面顶部栏用 `PageHeader`（`components/page-header.tsx`），内容分组用 `Section` / `Panel` / `ListGroup`（`components/section.tsx`）。
  - 底部标签栏只在「课程表」「老师 / 学生」「设置」页显示，其他页面用左上角的返回按钮。
  - 确认对话框等从屏幕底部弹出（`components/ui/dialog.tsx`）。
- 页面语言：优先使用用户手动选择的语言，其次使用设备语言，都不是日语或中文时显示日语（见 `web/src/i18n/index.ts`）。
- 时区：排课（每周课程、「每月最后一天」）固定按日本时间计算（`shared/lib/jst.ts`），课程表等画面按手机的时区显示。
- D1 每条 SQL 最多 100 个参数：一次写入多行时要分批（见 `server/lib/chunk.ts`）。
- D1 不支持跨多次请求的事务：需要同时写入多张表时用 `runBatch`（`server/db/client.ts`）。
- Workers 免费计划每个请求只有 10 毫秒 CPU 时间：图片上传时请求体直接流式写入 R2，不在 Worker 中解析。
- 实时更新：数据有变化的操作，在 service 中调用 `notifier.relationChanged()` 或 `profileChanged()`，否则对方的画面不会自动更新（见 `server/services/notifier.ts`）。新增这类接口时别忘了，并在 `server/routes/realtime.test.ts` 中加上对应的测试。
- Durable Objects 免费额度为每天 10 万次请求（建立连接、每次通知各算 1 次；发给画面的消息不计费），本项目的用量远远用不完。
- 短时间内多次执行 `wrangler d1 execute --remote` 等命令，可能触发 Cloudflare API 限流，导致紧接着的自动部署失败（错误码 971）。遇到时等一会儿，在控制台点 Retry build。
