// 网址：http:// 或 https:// 开头，到空白为止
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// 显示留言等文字：保留换行，网址变成可以点击的链接（例如老师发的 Zoom 链接）
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  // split 的结果中，奇数位置是匹配到的网址
  const parts = text.split(URL_PATTERN);
  return (
    // 很长的网址也能在任意位置换行，不会撑出画面
    <p className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${className ?? ""}`}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: 文字切分后的顺序固定，不会重新排列
          <a key={index} href={part} target="_blank" rel="noreferrer" className="underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
