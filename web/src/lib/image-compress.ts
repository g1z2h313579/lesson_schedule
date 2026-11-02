import { IMAGE_MAX_EDGE } from "@shared/constants/message";

// 压缩后的 JPEG 质量（0～1）：0.85 时文字清晰、文件也不大
const JPEG_QUALITY = 0.85;

/**
 * 上传前在手机上压缩图片：长边缩小到 2048 像素以内，转为 JPEG。
 * 用 <img> 读取，浏览器会按照片的拍摄方向自动转正。
 * 读取失败（个别安卓手机的 HEIC 等格式）时抛出错误。
 */
export async function compressImage(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法压缩图片");
    // 透明的 PNG 转为 JPEG 时，透明部分填成白色（否则会变黑）
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("无法压缩图片"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
