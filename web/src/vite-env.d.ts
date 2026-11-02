/// <reference types="vite/client" />

// 前端环境变量的类型（在 .env 系列文件中设置）
interface ImportMetaEnv {
  // LINE MINI App 的 LIFF ID
  readonly VITE_LIFF_ID: string;
  // 是否使用 LIFF Mock（仅本地开发有效）
  readonly VITE_LIFF_MOCK?: string;
  // 模拟用户的 LINE userId（仅本地开发有效）
  readonly VITE_MOCK_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
