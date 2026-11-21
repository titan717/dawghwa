const MAX_AVATAR_BYTES = 1_500_000;
const MAX_EDGE = 1024;

type ImageMime = "image/gif" | "image/png" | "image/jpeg" | "image/webp";
const MIME_TYPES = new Set<ImageMime>(["image/gif", "image/png", "image/jpeg", "image/webp"]);

function signatureMatches(type: string, bytes: Uint8Array): boolean {
  if (type === "image/gif") return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return false;
}

/** Validate and keep the original bytes so animated GIFs stay animated. */
export async function avatarFileToDataUrl(file: File): Promise<string> {
  if (!MIME_TYPES.has(file.type as ImageMime)) throw new Error("Choose a GIF, PNG, JPEG or WebP image.");
  if (file.size < 1 || file.size > MAX_AVATAR_BYTES) throw new Error("The image must be smaller than 1.5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(file.type, bytes)) throw new Error("The image file does not match its format.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("The image could not be decoded."));
      image.src = objectUrl;
    });
    if (!dimensions.width || !dimensions.height || dimensions.width > MAX_EDGE || dimensions.height > MAX_EDGE) {
      throw new Error("The image must be no larger than 1024 by 1024 pixels.");
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The image could not be read."));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

/** Accept only bounded inline image data; never render imported remote image URLs. */
export function isSafeAvatarDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_AVATAR_BYTES * 1.4) return false;
  const match = /^data:(image\/(?:gif|png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  try {
    const decoded = atob(match[2]!);
    return decoded.length <= MAX_AVATAR_BYTES && signatureMatches(match[1]!, Uint8Array.from(decoded.slice(0, 12), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
}
