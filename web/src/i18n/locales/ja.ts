import type { Translation } from "./zh";

// 日文文案（结构必须与 zh.ts 一致，缺少的项目会报类型错误）
export const ja: Translation = {
  app: {
    title: "レッスン管理",
  },
  language: {
    label: "言語",
  },
  home: {
    title: "Hello World",
    description: "フロントエンドとバックエンドがつながりました。",
    apiMessage: "API の応答",
    dbStatus: "データベース",
    currentUser: "ログイン中のユーザー",
    ok: "正常",
    unknownName: "（LINE の名前を取得できませんでした）",
  },
  notFound: {
    title: "ページが見つかりません",
    backHome: "ホームに戻る",
  },
  common: {
    loading: "読み込み中…",
    retry: "再試行",
  },
  errors: {
    bootFailed: "起動できませんでした。一度閉じてから、もう一度開いてください。",
    VALIDATION_ERROR: "入力内容に誤りがあります。確認してください。",
    UNAUTHORIZED: "ログインの有効期限が切れました。一度閉じてから、もう一度開いてください。",
    FORBIDDEN: "この操作を行う権限がありません。",
    NOT_FOUND: "見つかりませんでした。",
    CONFIG_ERROR: "システムの設定に問題があります。管理者に連絡してください。",
    INTERNAL_ERROR: "エラーが発生しました。しばらくしてから、もう一度お試しください。",
    NETWORK_ERROR: "通信に失敗しました。電波の良い場所で、もう一度お試しください。",
  },
};
