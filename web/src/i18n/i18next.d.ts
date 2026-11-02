import "i18next";
import type { resources } from "./index";

// 让 t("...") 的键名有类型提示和检查
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof resources)["zh"];
  }
}
