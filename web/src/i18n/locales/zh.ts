// 中文文案（作为基准，日文文案必须与这里的结构一致）
export const zh = {
  app: {
    title: "课程管理",
  },
  language: {
    label: "语言",
  },
  home: {
    title: "Hello World",
    description: "前后端都已连通，可以开始开发了。",
    apiMessage: "接口返回",
    dbStatus: "数据库",
    currentUser: "当前用户",
    ok: "正常",
  },
  notFound: {
    title: "页面不存在",
    backHome: "返回首页",
  },
  common: {
    loading: "加载中…",
    retry: "重试",
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
  },
};

// 文案的结构类型（日文等其他语言需要满足此类型）
type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};
export type Translation = DeepStringRecord<typeof zh>;
