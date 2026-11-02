import { MESSAGE_BODY_MAX_LENGTH } from "@shared/constants/message";
import { Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type LessonDetail,
  type MessageItem,
  useDeleteMessageMutation,
  useMessagesQuery,
  usePostMessageMutation,
} from "@/api/lessons";
import { useRegisteredMe } from "@/api/me";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LinkifiedText } from "@/components/linkified-text";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatLessonTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// 课程详情下方的留言板：对方的留言靠左、自己的靠右，请假等记录居中显示
// 打开期间每 30 秒自动刷新一次
export function MessageBoard({ detail }: { detail: LessonDetail }) {
  const { t } = useTranslation();
  const lessonId = detail.lesson.id;
  const messages = useMessagesQuery(lessonId);
  const remove = useDeleteMessageMutation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xl font-bold">{t("message.title")}</h3>
      {messages.isPending && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {messages.isError && <QueryError error={messages.error} onRetry={() => messages.refetch()} />}
      {messages.data?.messages.length === 0 && (
        <p className="text-muted-foreground">{t("message.empty")}</p>
      )}
      {messages.data && messages.data.messages.length > 0 && (
        <ul className="flex flex-col gap-4">
          {messages.data.messages.map((message) => (
            <li key={message.id}>
              {message.type === "text" ? (
                <TextMessage message={message} onDelete={() => setDeletingId(message.id)} />
              ) : (
                <RecordMessage message={message} detail={detail} />
              )}
            </li>
          ))}
        </ul>
      )}

      {detail.permissions.canPost && <Composer lessonId={lessonId} />}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={t("message.deleteConfirm")}
        confirmLabel={t("message.delete")}
        destructive
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() =>
          deletingId !== null && remove.mutate(deletingId, { onSuccess: () => setDeletingId(null) })
        }
      />
    </section>
  );
}

// 发言时间：「11月5日(木) 13:05」
function MessageTime({ createdAt }: { createdAt: string }) {
  const language = useLanguage();
  const date = new Date(createdAt);
  return (
    <span className="text-sm text-muted-foreground">
      {formatDate(date, language)} {formatTime(date, language)}
    </span>
  );
}

// 普通留言
function TextMessage({ message, onDelete }: { message: MessageItem; onDelete: () => void }) {
  const { t } = useTranslation();
  const me = useRegisteredMe();
  const mine = message.sender.id === me.id;

  return (
    <div className={cn("flex gap-2", mine && "flex-row-reverse")}>
      <UserAvatar
        name={message.sender.name}
        pictureUrl={message.sender.pictureUrl}
        className="size-10"
      />
      <div className={cn("flex min-w-0 max-w-[80%] flex-col gap-1", mine && "items-end")}>
        <span className="text-sm text-muted-foreground">{message.sender.name}</span>
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-lg",
            mine ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          <LinkifiedText text={message.body ?? ""} />
        </div>
        <span className="flex items-center gap-3">
          <MessageTime createdAt={message.createdAt} />
          {message.canDelete && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={onDelete}
            >
              {t("message.delete")}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

// 请假、取消、改时间的记录：文字按界面语言生成，附上理由
function RecordMessage({ message, detail }: { message: MessageItem; detail: LessonDetail }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const rescheduledTo = detail.rescheduledTo;
  const text =
    message.type === "reschedule" && rescheduledTo
      ? t("message.record.reschedule", {
          name: message.sender.name,
          time: formatLessonTime(
            new Date(rescheduledTo.startsAt),
            detail.lesson.durationMinutes,
            language,
          ),
        })
      : t(`message.record.${message.type === "leave" ? "leave" : "cancel"}`, {
          name: message.sender.name,
        });

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/60 px-4 py-3 text-center">
      <span className="text-lg font-bold">{text}</span>
      {message.body && <LinkifiedText text={message.body} className="text-muted-foreground" />}
      <MessageTime createdAt={message.createdAt} />
    </div>
  );
}

// 留言输入框
function Composer({ lessonId }: { lessonId: number }) {
  const { t } = useTranslation();
  const post = usePostMessageMutation(lessonId);
  const [body, setBody] = useState("");
  const trimmed = body.trim();

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <Textarea
        className="min-h-24 text-lg md:text-lg"
        value={body}
        maxLength={MESSAGE_BODY_MAX_LENGTH}
        placeholder={t("message.placeholder")}
        onChange={(event) => setBody(event.target.value)}
      />
      {post.error ? <QueryError error={post.error} /> : null}
      <Button
        className="h-12 text-lg"
        disabled={trimmed === "" || post.isPending}
        onClick={() => post.mutate(trimmed, { onSuccess: () => setBody("") })}
      >
        <Send className="size-5" aria-hidden />
        {post.isPending ? t("common.processing") : t("message.send")}
      </Button>
    </div>
  );
}
