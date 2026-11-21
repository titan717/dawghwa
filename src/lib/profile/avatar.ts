const MAX_AVATAR_BYTES = 1_500_000;
const MAX_EDGE = 1024;

type ImageMime = "image/gif" | "image/png" | "image/jpeg" | "image/webp";
const MIME_TYPES = new Set<ImageMime>(["image/gif", "image/png", "image/jpeg", "image/webp"]);

function dimensions(type: string, bytes: Uint8Array): { width: number; height: number } | undefined {
  const u16le = (i: number) => bytes[i]! | (bytes[i + 1]! << 8);
  const u16be = (i: number) => (bytes[i]! << 8) | bytes[i + 1]!;
  const u24le = (i: number) => bytes[i]! | (bytes[i + 1]! << 8) | (bytes[i + 2]! << 16);
  const u32be = (i: number) => bytes[i]! * 0x1000000 + (bytes[i + 1]! << 16) + (bytes[i + 2]! << 8) + bytes[i + 3]!;

  if (type === "image/gif" && bytes.length >= 10) return { width: u16le(6), height: u16le(8) };
  if (type === "image/png" && bytes.length >= 24) return { width: u32be(16), height: u32be(20) };
  if (type === "image/webp" && bytes.length >= 25) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X" && bytes.length >= 30) return { width: 1 + u24le(24), height: 1 + u24le(27) };
    if (chunk === "VP8L" && bytes[20] === 0x2f && bytes.length >= 25) {
      const bits = (bytes[24]! << 24) | (bytes[23]! << 16) | (bytes[22]! << 8) | bytes[21]!;
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      for (let i = 20; i + 9 < bytes.length; i++) {
        if (bytes[i] === 0x9d && bytes[i + 1] === 0x01 && bytes[i + 2] === 0x2a) {
          return { width: u16le(i + 3) & 0x3fff, height: u16le(i + 5) & 0x3fff };
        }
      }
    }
    return undefined;
  }
  if (type === "image/jpeg" && bytes.length >= 4) {
    let i = 2;
    while (i + 3 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1]!;
      i += 2;
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 1 >= bytes.length) return undefined;
      const size = u16be(i);
      if (size < 2 || i + size > bytes.length) return undefined;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (size < 7) return undefined;
        return { width: u16be(i + 5), height: u16be(i + 3) };
      }
      i += size;
    }
  }
  return undefined;
}

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
  if (file.size < 1 || file.size > MAX_AVATAR_BYTES) throw new Error("The image must be 1.5 MB or less.");
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
    if (decoded.length < 1 || decoded.length > MAX_AVATAR_BYTES) return false;
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    if (!signatureMatches(match[1]!, bytes)) return false;
    const size = dimensions(match[1]!, bytes);
    return Boolean(size && size.width > 0 && size.height > 0 && size.width <= MAX_EDGE && size.height <= MAX_EDGE);
  } catch {
    return false;
  }
}
