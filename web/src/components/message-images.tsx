import { useQueries } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { imageQueryOptions } from "@/api/lessons";
import { cn } from "@/lib/utils";

type ImageItem = { id: number; width: number; height: number };

// 全屏查看用的组件体积较大，第一次点图片时才加载
const ImageViewer = lazy(() => import("./image-viewer"));

// 留言中的图片：1 张时大图显示，多张时排成 3 列的方格
// 点图片全屏查看，可以双指缩放、左右滑动切换（老师发的教材截图要能看清文字）
export function MessageImages({ images }: { images: ImageItem[] }) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const urls = useQueries({ queries: images.map((image) => imageQueryOptions(image.id)) });
  const single = images.length === 1;

  return (
    <>
      <div className={cn("grid gap-1", single ? "grid-cols-1" : "grid-cols-3")}>
        {images.map((image, index) => {
          const url = urls[index]?.data;
          return (
            <button
              key={image.id}
              type="button"
              aria-label={t("message.openImage")}
              className="overflow-hidden rounded-lg bg-muted"
              // 加载出来之前先按图片的比例占好位置，页面不会跳动
              style={{ aspectRatio: single ? `${image.width} / ${image.height}` : "1 / 1" }}
              onClick={() => setOpenIndex(index)}
            >
              {url && <img src={url} alt="" className="size-full object-cover" />}
            </button>
          );
        })}
      </div>
      {openIndex !== null && (
        <Suspense fallback={null}>
          <ImageViewer
            index={openIndex}
            onClose={() => setOpenIndex(null)}
            slides={images.map((image, index) => ({
              src: urls[index]?.data ?? "",
              width: image.width,
              height: image.height,
            }))}
          />
        </Suspense>
      )}
    </>
  );
}
