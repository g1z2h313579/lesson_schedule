import { MESSAGE_BODY_MAX_LENGTH, MESSAGE_IMAGE_MAX_COUNT } from "@shared/constants/message";
import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useLanguage } from "@/hooks/use-language";
import { formatDate, formatLessonTime, formatTime } from "@/lib/format";
import { compressImage } from "@/lib/image-compress";
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
        {message.body && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-lg",
              mine ? "bg-primary text-primary-foreground" : "bg-muted",
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
    <div className="flex flex-col gap-2 border-t pt-4">
      <Textarea
        className="min-h-24 text-lg md:text-lg"
        value={body}
        maxLength={MESSAGE_BODY_MAX_LENGTH}
        placeholder={t("message.placeholder")}
        disabled={sending}
        onChange={(event) => setBody(event.target.value)}
      />
      {photos.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.preview} className="relative aspect-square">
              <img src={photo.preview} alt="" className="size-full rounded-md object-cover" />
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
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button
          variant="outline"
          className="h-12 px-4 text-lg"
          disabled={sending || photos.length >= MESSAGE_IMAGE_MAX_COUNT}
          aria-label={t("message.addImage")}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus className="size-6" aria-hidden />
          {t("message.photo")}
        </Button>
        <Button
          className="h-12 text-lg"
          disabled={(trimmed === "" && photos.length === 0) || sending}
          onClick={handleSend}
        >
          <Send className="size-5" aria-hidden />
          {progress && progress.total > 0 && progress.done < progress.total
            ? t("message.uploading", { done: progress.done + 1, total: progress.total })
            : sending
              ? t("common.processing")
              : t("message.send")}
        </Button>
      </div>
    </div>
  );
}
