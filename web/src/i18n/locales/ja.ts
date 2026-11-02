import type { Translation } from "./zh";

// 日文文案（结构必须与 zh.ts 一致，缺少的项目会报类型错误）
export const ja: Translation = {
  app: {
    title: "レッスン管理",
  },
  language: {
    label: "言語",
  },
  roles: {
    teacher: "先生",
    student: "生徒",
  },
  home: {
    greeting: "{{name}} さん、こんにちは",
    placeholder: "ここにレッスンの予定が表示されます。",
  },
  onboarding: {
    title: "初回設定",
    roleQuestion: "あなたの立場を選んでください。",
    roleNote: "選んだ立場は、あとからご自身では変更できません。",
    roles: {
      teacher: { title: "先生です", description: "生徒にレッスンをして、予定を組みます" },
      student: { title: "生徒です", description: "先生のレッスンを受けて、回数を申請します" },
    },
    profileTitle: "基本情報の入力",
    changeRole: "選び直す",
    submit: "完了",
  },
  profile: {
    name: "お名前",
    nameHint: "相手にはこの名前が表示されます。",
    nameRequired: "お名前を入力してください。",
    nameTooLong: "お名前は {{max}} 文字以内で入力してください。",
    introduction: "自己紹介",
    optional: "任意",
    introductionPlaceholder: "例：日本語の会話を練習したいです。",
    introductionTooLong: "自己紹介は {{max}} 文字以内で入力してください。",
  },
  settings: {
    title: "設定",
    role: "立場",
    roleNote: "立場はご自身では変更できません。間違えた場合は管理者に連絡してください。",
    save: "保存",
    saved: "保存しました。",
  },
  notFound: {
    title: "ページが見つかりません",
    backHome: "ホームに戻る",
  },
  common: {
    loading: "読み込み中…",
    retry: "再試行",
    saving: "保存中…",
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
    NOT_REGISTERED: "先に初回設定を完了してください。",
    ALREADY_REGISTERED: "初回設定はすでに完了しています。",
    INVITATION_EXPIRED: "この招待は有効期限が切れています。もう一度招待してもらってください。",
    INVITATION_USED: "この招待はすでに使われています。",
    INVITATION_SELF: "ご自身が送った招待です。",
    INVITATION_SAME_ROLE: "先生同士、生徒同士はつながることができません。",
    ALREADY_LINKED: "すでにつながっています。",
    CREDIT_REQUEST_PENDING: "先生の確認を待っている申請がすでにあります。",
    REQUEST_ALREADY_DECIDED: "この申請はすでに処理されています。",
    INSUFFICIENT_CREDITS: "残りのレッスン回数が足りません。",
    SLOT_UNAVAILABLE: "この時間は選べません。別の時間を選んでください。",
    LESSON_ALREADY_STARTED: "このレッスンはすでに始まっているため、変更できません。",
  },
};
