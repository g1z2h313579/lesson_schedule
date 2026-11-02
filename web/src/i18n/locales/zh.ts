// 中文文案（作为基准，日文文案必须与这里的结构一致）
export const zh = {
  app: {
    title: "课程管理",
  },
  language: {
    label: "语言",
  },
  roles: {
    teacher: "老师",
    student: "学生",
  },
  home: {
    greeting: "{{name}}，你好",
    placeholder: "课程表将显示在这里。",
  },
  onboarding: {
    title: "首次设置",
    roleQuestion: "请选择你的身份。",
    roleNote: "身份选定后，自己不能再修改。",
    roles: {
      teacher: { title: "我是老师", description: "给学生上课，安排课程" },
      student: { title: "我是学生", description: "跟老师上课，申请课时" },
    },
    profileTitle: "填写基本信息",
    changeRole: "重新选择",
    submit: "完成",
  },
  profile: {
    name: "名字",
    nameHint: "对方会看到这个名字。",
    nameRequired: "请填写名字。",
    nameTooLong: "名字最多 {{max}} 字。",
    introduction: "自我介绍",
    optional: "选填",
    introductionPlaceholder: "例：在日本工作，想提高日语会话能力。",
    introductionTooLong: "自我介绍最多 {{max}} 字。",
  },
  settings: {
    title: "设置",
    role: "身份",
    roleNote: "身份不能自己修改。选错时请联系管理员。",
    save: "保存",
    saved: "已保存。",
  },
  notFound: {
    title: "页面不存在",
    backHome: "返回首页",
  },
  common: {
    loading: "加载中…",
    retry: "重试",
    saving: "保存中…",
  },
  errors: {
    bootFailed: "启动失败，请关闭后重新打开。",
    VALIDATION_ERROR: "输入的内容有误，请检查后重试。",
    UNAUTHORIZED: "登录已失效，请关闭后重新打开。",
    FORBIDDEN: "没有权限进行此操作。",
    NOT_FOUND: "找不到对应的内容。",
    CONFIG_ERROR: "系统设置有误，请联系管理员。",
    INTERNAL_ERROR: "系统出错了，请稍后再试。",
    NETWORK_ERROR: "网络连接失败，请检查网络后重试。",
    NOT_REGISTERED: "请先完成首次设置。",
    ALREADY_REGISTERED: "已经完成首次设置了。",
    INVITATION_EXPIRED: "这个邀请已过期，请让对方重新邀请。",
    INVITATION_USED: "这个邀请已被使用。",
    INVITATION_SELF: "这是你自己发出的邀请。",
    INVITATION_SAME_ROLE: "老师之间、学生之间不能关联。",
    ALREADY_LINKED: "你们已经关联了。",
    CREDIT_REQUEST_PENDING: "已有一个申请正在等待老师处理。",
    REQUEST_ALREADY_DECIDED: "这个申请已经处理过了。",
    INSUFFICIENT_CREDITS: "剩余课时不足。",
    SLOT_UNAVAILABLE: "这个时段不能选，请换一个时段。",
    LESSON_ALREADY_STARTED: "这节课已经开始，不能再更改。",
  },
};

// 文案的结构类型（日文等其他语言需要满足此类型）
type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};
export type Translation = DeepStringRecord<typeof zh>;
