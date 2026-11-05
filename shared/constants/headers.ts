// 前后端共用的自定义请求头名称

// LINE access token：前端只在 GET /api/me 时附带，后端用它获取 LINE 昵称和头像
export const LINE_ACCESS_TOKEN_HEADER = "X-Line-Access-Token";

// 模拟用户的 userId：只在本地开发（后端 AUTH_MOCK=true）时有效
export const MOCK_USER_ID_HEADER = "X-Mock-User-Id";

// WebSocket 连接不能设置请求头，模拟用户的 userId 改用这个查询参数传递（同样只在本地开发时有效）
export const MOCK_USER_ID_QUERY = "mockUserId";
