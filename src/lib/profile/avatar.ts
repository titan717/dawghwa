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

const MAX_GIF_FRAMES = 120;
const MAX_GIF_TOTAL_PIXELS = 8_000_000;

function u32le(bytes: Uint8Array, i: number): number {
  return bytes[i]! + bytes[i + 1]! * 0x100 + bytes[i + 2]! * 0x10000 + bytes[i + 3]! * 0x1000000;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): { next: number; dataBytes: number } | undefined {
  let offset = start;
  let dataBytes = 0;
  while (offset < bytes.length) {
    const size = bytes[offset++]!;
    if (size === 0) return { next: offset, dataBytes };
    if (size > bytes.length - offset) return undefined;
    dataBytes += size;
    offset += size;
  }
  return undefined;
}

/** Validate every frame before asking the browser to decode an animated GIF. */
function gifFramesAreSafe(bytes: Uint8Array): boolean {
  if (bytes.length < 14) return false;
  const width = bytes[6]! | (bytes[7]! << 8);
  const height = bytes[8]! | (bytes[9]! << 8);
  if (!width || !height || width > MAX_EDGE || height > MAX_EDGE) return false;

  let offset = 13;
  const screenPacked = bytes[10]!;
  const hasGlobalTable = (screenPacked & 0x80) !== 0;
  if (hasGlobalTable) {
    const tableBytes = 3 * (1 << ((screenPacked & 0x07) + 1));
    if (tableBytes > bytes.length - offset) return false;
    offset += tableBytes;
  }

  let frames = 0;
  let totalPixels = 0;
  while (offset < bytes.length) {
    const block = bytes[offset++]!;
    if (block === 0x3b) return frames > 0 && offset === bytes.length;

    if (block === 0x21) {
      if (offset >= bytes.length) return false;
      const label = bytes[offset++]!;
      if (label === 0xf9) {
        if (offset + 6 > bytes.length || bytes[offset] !== 4 || bytes[offset + 5] !== 0) return false;
        offset += 6;
      } else {
        // Plain Text Extensions are rendering blocks whose work is not represented by image frames.
        if (label === 0x01) return false;
        if (label === 0xff) {
          const headerSize = 11;
          if (offset >= bytes.length || bytes[offset] !== headerSize || headerSize + 1 > bytes.length - offset) return false;
          offset += headerSize + 1;
        }
        const extension = skipGifSubBlocks(bytes, offset);
        if (!extension) return false;
        offset = extension.next;
      }
      continue;
    }

    if (block !== 0x2c || offset + 9 > bytes.length) return false;
    const left = bytes[offset]! | (bytes[offset + 1]! << 8);
    const top = bytes[offset + 2]! | (bytes[offset + 3]! << 8);
    const frameWidth = bytes[offset + 4]! | (bytes[offset + 5]! << 8);
    const frameHeight = bytes[offset + 6]! | (bytes[offset + 7]! << 8);
    const imagePacked = bytes[offset + 8]!;
    offset += 9;

    if (!frameWidth || !frameHeight || left + frameWidth > width || top + frameHeight > height) return false;
    if (imagePacked & 0x80) {
      const tableBytes = 3 * (1 << ((imagePacked & 0x07) + 1));
      if (tableBytes > bytes.length - offset) return false;
      offset += tableBytes;
    } else if (!hasGlobalTable) {
      return false;
    }

    if (offset >= bytes.length || bytes[offset]! < 2 || bytes[offset]! > 8) return false;
    offset += 1; // LZW minimum code size
    const imageData = skipGifSubBlocks(bytes, offset);
    if (!imageData || imageData.dataBytes === 0) return false;
    offset = imageData.next;

    frames += 1;
    totalPixels += width * height;
    if (frames > MAX_GIF_FRAMES || totalPixels > MAX_GIF_TOTAL_PIXELS) return false;
  }
  return false;
}

/** Reject animated PNG/APNG unless frame decoding can be bounded. */
function pngIsStaticAndWellFormed(bytes: Uint8Array): boolean {
  let offset = 8;
  let sawHeader = false;
  let sawData = false;
  let dataEnded = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) return false;
    const length = (bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
    if (length > bytes.length - offset - 12) return false;
    const type = ascii(bytes, offset + 4, 4);
    if (!sawHeader && (type !== "IHDR" || length !== 13)) return false;
    if (type === "acTL" || type === "fcTL" || type === "fdAT") return false;
    // Reject compressed profiles/text and unknown metadata; their decoded work is not bounded here.
    if (["iCCP", "zTXt", "iTXt"].includes(type)) return false;
    const knownCore = ["IHDR", "PLTE", "IDAT", "IEND"];
    const safeAncillary = ["cHRM", "gAMA", "sRGB", "sBIT", "bKGD", "pHYs", "tIME", "tRNS", "hIST", "eXIf", "tEXt"];
    const isAncillary = (type.charCodeAt(0) & 0x20) !== 0;
    if (!knownCore.includes(type) && (!isAncillary || !safeAncillary.includes(type) || length > 65_536)) return false;
    if (type === "IHDR") {
      if (sawHeader) return false;
      sawHeader = true;
    } else if (type === "IDAT") {
      if (dataEnded) return false;
      sawData = true;
    } else if (sawData) {
      dataEnded = true;
    }
    offset += length + 12;
    if (type === "IEND") return length === 0 && sawHeader && sawData && offset === bytes.length;
  }
  return false;
}

/** Bound the RIFF chunks, reject animation, and check coded WebP dimensions as well as canvas dimensions. */
function webpIsStaticAndWellFormed(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || u32le(bytes, 4) + 8 !== bytes.length) return false;
  let offset = 12;
  let canvas: { width: number; height: number } | undefined;
  let image: { width: number; height: number } | undefined;
  let sawImage = false;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return false;
    const type = ascii(bytes, offset, 4);
    const length = u32le(bytes, offset + 4);
    const data = offset + 8;
    const end = data + length;
    const next = end + (length & 1);
    if (end > bytes.length || next > bytes.length) return false;
    if (type === "ANIM" || type === "ANMF") return false;

    if (type === "VP8X") {
      if (offset !== 12 || canvas || length !== 10 || (bytes[data]! & 0x02) !== 0) return false;
      canvas = { width: 1 + (bytes[data + 4]! | (bytes[data + 5]! << 8) | (bytes[data + 6]! << 16)), height: 1 + (bytes[data + 7]! | (bytes[data + 8]! << 8) | (bytes[data + 9]! << 16)) };
      if (canvas.width > MAX_EDGE || canvas.height > MAX_EDGE) return false;
    } else if (type === "VP8 ") {
      if (sawImage || length < 10 || (bytes[data]! & 1) !== 0 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) return false;
      image = { width: (bytes[data + 6]! | (bytes[data + 7]! << 8)) & 0x3fff, height: (bytes[data + 8]! | (bytes[data + 9]! << 8)) & 0x3fff };
      sawImage = true;
    } else if (type === "VP8L") {
      if (sawImage || length < 5 || bytes[data] !== 0x2f) return false;
      const b1 = bytes[data + 1]!;
      const b2 = bytes[data + 2]!;
      const b3 = bytes[data + 3]!;
      const b4 = bytes[data + 4]!;
      image = { width: 1 + b1 + ((b2 & 0x3f) << 8), height: 1 + (b2 >>> 6) + (b3 << 2) + ((b4 & 0x0f) << 10) };
      sawImage = true;
    }
    offset = next;
  }
  if (offset !== bytes.length || !image || image.width < 1 || image.height < 1 || image.width > MAX_EDGE || image.height > MAX_EDGE) return false;
  if (canvas && (canvas.width !== image.width || canvas.height !== image.height)) return false;
  return true;
}

function safeImageBytes(type: string, bytes: Uint8Array): boolean {
  if (!signatureMatches(type, bytes)) return false;
  const size = dimensions(type, bytes);
  if (!size || !size.width || !size.height || size.width > MAX_EDGE || size.height > MAX_EDGE) return false;
  if (type === "image/gif") return gifFramesAreSafe(bytes);
  if (type === "image/png") return pngIsStaticAndWellFormed(bytes);
  if (type === "image/webp") return webpIsStaticAndWellFormed(bytes);
  return type === "image/jpeg";
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
  if (!safeImageBytes(file.type, bytes)) throw new Error("The image is invalid, animated in an unsupported format, or exceeds 1024 by 1024 pixels.");

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
    return safeImageBytes(match[1]!, bytes);
  } catch {
    return false;
  }
}
