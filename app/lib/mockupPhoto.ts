/**
 * Loads a panel from the generated product-photo plate, removes its solid
 * magenta key background, and returns a cropped transparent canvas.
 * The user's uploaded artwork remains separate and editable above this layer.
 */
export type MockupPhotoKind = "shirt-front" | "shirt-back" | "tumbler";

const PANEL: Record<MockupPhotoKind, [number, number, number, number]> = {
  "shirt-front": [0.00, 0.00, 0.37, 1.00],
  "shirt-back": [0.36, 0.00, 0.37, 1.00],
  tumbler: [0.73, 0.00, 0.25, 1.00],
};

const cache = new Map<MockupPhotoKind, Promise<HTMLCanvasElement>>();

export function loadMockupPhoto(kind: MockupPhotoKind): Promise<HTMLCanvasElement> {
  const cached = cache.get(kind);
  if (cached) return cached;

  const pending = new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const [left, top, width, height] = PANEL[kind];
      const source = document.createElement("canvas");
      source.width = Math.round(image.naturalWidth * width);
      source.height = Math.round(image.naturalHeight * height);
      const sourceContext = source.getContext("2d", { willReadFrequently: true });
      if (!sourceContext) {
        reject(new Error("Canvas 2D context unavailable."));
        return;
      }
      sourceContext.drawImage(
        image,
        Math.round(image.naturalWidth * left),
        Math.round(image.naturalHeight * top),
        source.width,
        source.height,
        0,
        0,
        source.width,
        source.height,
      );

      const pixels = sourceContext.getImageData(0, 0, source.width, source.height);
      const data = pixels.data;
      let minX = source.width;
      let minY = source.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const i = (y * source.width + x) * 4;
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const isMagenta = red + blue - 2 * green > 28 && green < 220 && red > 150 && blue > 150;
          if (isMagenta) data[i + 3] = Math.min(data[i + 3], green);
          if (data[i + 3] > 24) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      if (maxX < minX || maxY < minY) {
        reject(new Error("Product mockup image could not be isolated."));
        return;
      }
      sourceContext.putImageData(pixels, 0, 0);

      const padding = Math.round(Math.max(maxX - minX, maxY - minY) * 0.035);
      const x = Math.max(0, minX - padding);
      const y = Math.max(0, minY - padding);
      const right = Math.min(source.width, maxX + padding + 1);
      const bottom = Math.min(source.height, maxY + padding + 1);
      const cropped = document.createElement("canvas");
      cropped.width = right - x;
      cropped.height = bottom - y;
      const croppedContext = cropped.getContext("2d");
      if (!croppedContext) {
        reject(new Error("Canvas 2D context unavailable."));
        return;
      }
      croppedContext.drawImage(source, x, y, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
      resolve(cropped);
    };
    image.onerror = () => reject(new Error("Product mockup image failed to load."));
    image.src = "/mnh-mockup-products.png";
  });
  cache.set(kind, pending);
  return pending;
}
