import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = import.meta.dirname;

export default defineConfig({
  // 前端源码（index.html）在 web/ 目录下
  root: path.resolve(rootDir, "web"),
  // .env 系列文件放在项目根目录
  envDir: rootDir,
  plugins: [
    react(),
    tailwindcss(),
    // 在本地用 workerd（与线上相同的运行时）运行后端，并提供本地 D1
    cloudflare({
      configPath: path.resolve(rootDir, "wrangler.jsonc"),
      // 本地数据与 wrangler CLI 共用同一目录（便于 `pnpm db:migrate:local`）
      persistState: { path: path.resolve(rootDir, ".wrangler/state") },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "web/src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@server": path.resolve(rootDir, "server"),
    },
  },
  build: {
    // 构建产物：dist/client（前端）和 dist/lesson_schedule（Worker，目录名来自 wrangler.jsonc 的 name）
    // 部署时用 `pnpm deploy:worker` 指定 dist/lesson_schedule/wrangler.json
    outDir: path.resolve(rootDir, "dist"),
    emptyOutDir: true,
    // LIFF SDK 体积较大，适当放宽单个文件的体积警告阈值（单位 kB）
    // 主文件约 830 kB（压缩后约 250 kB），图片全屏查看等较大的功能已拆成按需加载
    chunkSizeWarningLimit: 900,
  },
  server: {
    // 用 cloudflared 隧道在手机 LINE 中真机调试时，需要放行隧道域名
    allowedHosts: [".trycloudflare.com"],
  },
});
