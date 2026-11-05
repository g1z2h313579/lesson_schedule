import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  pictureUrl: string | null;
  className?: string;
};

// 用户头像：有 LINE 头像时显示图片，没有（或加载失败）时显示名字的第一个字
export function UserAvatar({ name, pictureUrl, className }: Props) {
  return (
    <Avatar className={cn("size-12", className)}>
      {pictureUrl && <AvatarImage src={pictureUrl} alt="" />}
      <AvatarFallback className="bg-brand-soft text-lg font-bold text-brand-soft-foreground">
        {Array.from(name.trim())[0] ?? "?"}
      </AvatarFallback>
    </Avatar>
  );
}
