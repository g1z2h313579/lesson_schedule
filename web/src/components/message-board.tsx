import { MESSAGE_BODY_MAX_LENGTH, MESSAGE_IMAGE_MAX_COUNT } from "@shared/constants/message";
import { ImagePlus, MessagesSquare, SendHorizontal, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type LessonDetail,
  type MessageItem,
  uploadLessonImage,
  useDeleteMessageMutation,
  useMessagesQuery,
  usePostMessageMutation,
} from "@/api/lessons";
import { useRegisteredMe } from "@/api/me";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LinkifiedText } from "@/components/linkified-text";
import { MessageImages } from "@/components/message-images";
import { QueryError } from "@/components/query-error";
import { EmptyState, Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatLessonTime, formatTime } from "@/lib/format";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

// 课程详情下方的留言板（聊天的样式）：对方的留言靠左、自己的靠右（主题色），取消等记录居中显示
// 输入框固定在画面底部。对方发言后通过实时更新自动显示（连接不上时每 30 秒刷新一次）
export function MessageBoard({ detail }: { detail: LessonDetail }) {
  const { t } = useTranslation();
  const lessonId = detail.lesson.id;
  const messages = useMessagesQuery(lessonId);
  const remove = useDeleteMessageMutation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  return (
    <Section title={t("message.title")} className="flex-1">
      {messages.isPending && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {messages.isError && <QueryError error={messages.error} onRetry={() => messages.refetch()} />}
      {messages.data?.messages.length === 0 && (
        <EmptyState
          icon={<MessagesSquare className="size-6 shrink-0" aria-hidden />}
          text={t("message.empty")}
        />
      )}
      {messages.data && messages.data.messages.length > 0 && (
        <ul className="flex flex-col gap-4 py-1">
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

      {/* 把输入框推到页面最下方（留言少的时候也在底部） */}
      <div className="flex-1" />
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
    </Section>
  );
}

// 发言时间：「11月5日(木) 13:05」
function MessageTime({ createdAt }: { createdAt: string }) {
  const language = useLanguage();
  const date = new Date(createdAt);
  return (
    <span className="text-xs text-muted-foreground">
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
    <div className={cn("flex gap-2", mine && "justify-end")}>
      {/* 自己的留言不显示头像和名字 */}
      {!mine && (
        <UserAvatar
          name={message.sender.name}
          pictureUrl={message.sender.pictureUrl}
          className="size-9 text-base"
        />
      )}
      <div className={cn("flex min-w-0 max-w-[80%] flex-col gap-1", mine && "items-end")}>
        {!mine && <span className="text-sm text-muted-foreground">{message.sender.name}</span>}
        {message.body && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-lg",
              mine ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md bg-card",
            )}
          >
            <LinkifiedText text={message.body} />
          </div>
        )}
        {message.images.length > 0 && (
          <div className="w-64 max-w-full">
            <MessageImages images={message.images} />
          </div>
        )}
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

// 取消、改时间的记录：文字按界面语言生成，附上理由
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
      : t("message.record.cancel", { name: message.sender.name });

  return (
    <div className="mx-auto flex max-w-[90%] flex-col items-center gap-1 rounded-2xl bg-black/5 px-4 py-2.5 text-center">
      <span className="font-bold">{text}</span>
      {message.body && <LinkifiedText text={message.body} className="text-muted-foreground" />}
      <MessageTime createdAt={message.createdAt} />
    </div>
  );
}

// 留言输入框：文字和照片（最多 9 张）。发送时依次压缩、上传照片，全部完成后发出留言
function Composer({ lessonId }: { lessonId: number }) {
  const { t } = useTranslation();
  const post = usePostMessageMutation(lessonId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  // 上传进度：第几张 / 共几张（null 表示没有在发送）
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const trimmed = body.trim();
  const sending = progress !== null || post.isPending;
  const textarea = useRef<HTMLTextAreaElement>(null);

  // 输入框随内容变高（iPhone 的浏览器不支持 CSS 的 field-sizing，用脚本计算高度）
  // biome-ignore lint/correctness/useExhaustiveDependencies: 内容（body）变化时重新计算
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    // scrollHeight 不含边框，加上边框的高度，避免出现滚动条
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  }, [body]);

  const addPhotos = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    const room = MESSAGE_IMAGE_MAX_COUNT - photos.length;
    if (selected.length > room) {
      toast.error(t("message.tooManyImages", { max: MESSAGE_IMAGE_MAX_COUNT }));
    }
    setPhotos([
      ...photos,
      ...selected.slice(0, Math.max(0, room)).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    try {
      setProgress({ done: 0, total: photos.length });
      const images = [];
      for (const [index, photo] of photos.entries()) {
        let compressed: Awaited<ReturnType<typeof compressImage>>;
        try {
          compressed = await compressImage(photo.file);
        } catch {
          toast.error(t("message.imageUnsupported"));
          return;
        }
        const { key } = await uploadLessonImage(lessonId, compressed.blob);
        images.push({ key, width: compressed.width, height: compressed.height });
        setProgress({ done: index + 1, total: photos.length });
      }
      await post.mutateAsync({ body: trimmed, images });
      for (const photo of photos) URL.revokeObjectURL(photo.preview);
      setPhotos([]);
      setBody("");
    } catch (error) {
      // 失败时保留文字和照片，可以直接再点一次发送
      console.warn("[留言] 发送失败", error);
      toast.error(t("message.sendFailed"));
    } finally {
      setProgress(null);
    }
  };

  return (
    // 固定在画面底部的输入栏：左边照片、中间输入框（随内容变高）、右边发送
    <div className="sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-col gap-2 border-t bg-card/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur">
      {photos.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto pt-2">
          {photos.map((photo, index) => (
            <li key={photo.preview} className="relative size-16 shrink-0">
              <img src={photo.preview} alt="" className="size-full rounded-lg object-cover" />
              {!sending && (
                <button
                  type="button"
                  aria-label={t("message.removeImage")}
                  className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-foreground text-background"
                  onClick={() => removePhoto(index)}
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {progress && progress.total > 0 && progress.done < progress.total && (
        <p className="text-sm text-muted-foreground">
          {t("message.uploading", { done: progress.done + 1, total: progress.total })}
        </p>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          addPhotos(event.target.files);
          // 清空选择，同一张照片去掉后还能再选
          event.target.value = "";
        }}
      />
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full text-muted-foreground"
          disabled={sending || photos.length >= MESSAGE_IMAGE_MAX_COUNT}
          aria-label={t("message.addImage")}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus className="size-7" aria-hidden />
        </Button>
        <Textarea
          ref={textarea}
          rows={1}
          className="max-h-40 min-h-11 resize-none rounded-3xl border-transparent bg-muted py-2"
          value={body}
          maxLength={MESSAGE_BODY_MAX_LENGTH}
          placeholder={t("message.placeholder")}
          aria-label={t("message.placeholder")}
          disabled={sending}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          disabled={(trimmed === "" && photos.length === 0) || sending}
          aria-label={t("message.send")}
          onClick={handleSend}
        >
          <SendHorizontal className="size-6" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
