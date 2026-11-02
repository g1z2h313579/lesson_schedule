import { useParams } from "react-router";
import { useMeQuery } from "@/api/me";

// 邀请确认页（暂定）：阶段 2 的手机验证用，只显示收到的邀请码和网址
// 验证完成后改为正式的邀请确认页（显示邀请人资料、「接受」按钮）
// 未完成首次设置的用户也能打开（不放在 RequireRegistered 之下）
export function InvitePage() {
  const { code } = useParams();
  const me = useMeQuery();

  return (
    <div className="flex flex-col gap-3 text-lg">
      <h2 className="text-2xl font-bold">邀请（测试）</h2>
      <p>邀请码：{code}</p>
      <p className="text-sm break-all text-muted-foreground">网址：{window.location.href}</p>
      <p>
        当前用户：
        {me.data
          ? `${me.data.user.name ?? me.data.user.lineDisplayName}（${me.data.user.registered ? "已完成首次设置" : "未完成首次设置"}）`
          : "加载中…"}
      </p>
    </div>
  );
}
