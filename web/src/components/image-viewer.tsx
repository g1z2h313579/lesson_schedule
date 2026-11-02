import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

type Props = {
  slides: { src: string; width: number; height: number }[];
  index: number;
  onClose: () => void;
};

// 全屏查看图片：双指缩放、左右滑动切换
// 体积较大，由 message-images.tsx 在第一次点图片时才加载（不放进首次打开的代码中）
export default function ImageViewer({ slides, index, onClose }: Props) {
  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 4 }}
      carousel={{ finite: true }}
      slides={slides}
    />
  );
}
