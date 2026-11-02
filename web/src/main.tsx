import "./styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { BootError } from "./components/boot-error";
import { initI18n } from "./i18n";
import { initLiff } from "./lib/liff";

async function bootstrap() {
  const root = createRoot(document.getElementById("root") as HTMLElement);

  // 先初始化多语言（启动失败时的提示也需要翻译）
  await initI18n();

  try {
    // LIFF 初始化完成（已登录）后再渲染页面
    await initLiff();
  } catch (error) {
    console.error("[LIFF] 初始化失败", error);
    root.render(<BootError error={error} />);
    return;
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
