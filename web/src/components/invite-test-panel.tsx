import { useState } from "react";
import { Button } from "@/components/ui/button";
import { liff } from "@/lib/liff";

// 临时：阶段 2 开始前在手机上验证 LINE 好友邀请是否可行，验证完成后删除
// 验证 3 点：① 能否打开好友选择画面 ② 卡片能否送达 ③ 对方点卡片后能否进入 /invite/test 页面
// 只在开发者本人验证时使用，文字不做多语言

type ShareMessages = Parameters<typeof liff.shareTargetPicker>[0];

function buildTestMessages(url: string): ShareMessages {
  return [
    {
      type: "flex",
      altText: "テスト招待 / 测试邀请",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "テスト招待です", weight: "bold", size: "lg", wrap: true },
            {
              type: "text",
              text: "这是测试邀请，请点下面的按钮打开。",
              wrap: true,
              color: "#666666",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              action: { type: "uri", label: "開く / 打开", uri: url },
            },
          ],
        },
      },
    },
  ];
}

function describeError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const { code, message } = error as { code: unknown; message?: unknown };
    return `${String(code)} ${String(message ?? "")}`;
  }
  return String(error);
}

export function InviteTestPanel() {
  const [log, setLog] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const append = (line: string) => setLog((lines) => [...lines, line]);

  const environment = [
    `在 LINE 中打开：${liff.isInClient() ? "是" : "否"}`,
    `LINE 版本：${liff.getLineVersion() ?? "-"}`,
    `系统：${liff.getOS() ?? "-"}`,
    `可以使用好友选择画面：${liff.isApiAvailable("shareTargetPicker") ? "是" : "否"}`,
  ];

  const handleClick = async () => {
    setLog([]);
    try {
      const url = await liff.permanentLink.createUrlBy(`${window.location.origin}/invite/test`);
      setLink(url);
      append(`邀请链接：${url}`);
      if (!liff.isApiAvailable("shareTargetPicker")) {
        append("无法使用好友选择画面（可以复制上面的链接，手动发给对方）");
        return;
      }
      const result = await liff.shareTargetPicker(buildTestMessages(url), { isMultiple: false });
      append(result ? `发送结果：${result.status}` : "没有发送（关闭了选择画面）");
    } catch (error) {
      append(`出错：${describeError(error)}`);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border-2 border-dashed p-4">
      <h3 className="text-lg font-bold">测试邀请（临时）</h3>
      <ul className="text-sm text-muted-foreground">
        {environment.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Button className="h-12 text-lg" onClick={handleClick}>
        发送测试邀请
      </Button>
      {link && (
        <Button variant="outline" onClick={() => navigator.clipboard?.writeText(link)}>
          复制邀请链接
        </Button>
      )}
      {log.length > 0 && (
        <ul className="text-sm break-all">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
