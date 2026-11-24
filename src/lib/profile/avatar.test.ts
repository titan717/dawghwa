import { describe, expect, it } from "vitest";
import { isSafeAvatarDataUrl } from "./avatar";

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function gif(width: number, height: number, frames: Array<[number, number, number, number]>): Uint8Array {
  const le16 = (n: number) => [n & 255, (n >> 8) & 255];
  const out = [
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    ...le16(width), ...le16(height),
    0xf0, 0, 0, 0, 0, 0, 255, 255, 255,
  ];
  for (const [left, top, frameWidth, frameHeight] of frames) {
    out.push(0x2c, ...le16(left), ...le16(top), ...le16(frameWidth), ...le16(frameHeight), 0, 2, 2, 0x44, 0x01, 0);
  }
  out.push(0x3b);
  return new Uint8Array(out);
}

function jpegSof(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    1, 1, 0x11, 0,
  ]);
}

function webp(width: number, height: number, animated = false): Uint8Array {
  const b = new Uint8Array(48);
  const ascii = (s: string, offset: number) => b.set([...s].map((c) => c.charCodeAt(0)), offset);
  const le32 = (n: number, offset: number) => {
    b[offset] = n & 255;
    b[offset + 1] = (n >>> 8) & 255;
    b[offset + 2] = (n >>> 16) & 255;
    b[offset + 3] = (n >>> 24) & 255;
  };
  ascii("RIFF", 0); le32(40, 4); ascii("WEBP", 8);
  ascii("VP8X", 12); le32(10, 16); b[20] = animated ? 2 : 0;
  const wm1 = width - 1, hm1 = height - 1;
  b[24] = wm1 & 255; b[25] = (wm1 >>> 8) & 255; b[26] = (wm1 >>> 16) & 255;
  b[27] = hm1 & 255; b[28] = (hm1 >>> 8) & 255; b[29] = (hm1 >>> 16) & 255;
  ascii("VP8 ", 30); le32(10, 34); b[38] = 0;
  b.set([0, 0, 0x9d, 0x01, 0x2a], 39);
  b[44] = width & 255; b[45] = (width >>> 8) & 0x3f;
  b[46] = height & 255; b[47] = (height >>> 8) & 0x3f;
  return b;
}

describe("safe profile avatar data", () => {
  it("accepts bounded multi-frame GIFs", () => {
    const bytes = gif(24, 24, [[0, 0, 24, 24], [0, 0, 24, 24]]);
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(bytes)}`)).toBe(true);
  });

  it("rejects a GIF frame extending outside its logical canvas", () => {
    const bytes = gif(1, 1, [[0, 0, 2, 1]]);
    const oversizedDescriptor = gif(1, 1, [[0, 0, 65535, 65535]]);
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(bytes)}`)).toBe(false);
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(oversizedDescriptor)}`)).toBe(false);
  });

  it("rejects GIF Plain Text Extensions outside the image-frame budget", () => {
    const base = gif(1, 1, [[0, 0, 1, 1]]);
    const textExtension = new Uint8Array([...base.slice(0, -1), 0x21, 0x01, 0x0c, ...Array(12).fill(0), 0, 0x3b]);
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(textExtension)}`)).toBe(false);
  });

  it("rejects excessive GIF frame count and cumulative decode work", () => {
    const manyFrames = gif(1, 1, Array.from({ length: 121 }, () => [0, 0, 1, 1] as [number, number, number, number]));
    const withinBudget = gif(1024, 1024, Array.from({ length: 7 }, () => [0, 0, 1024, 1024] as [number, number, number, number]));
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(manyFrames)}`)).toBe(false);
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(withinBudget)}`)).toBe(true);
    const overBudget = gif(1024, 1024, Array.from({ length: 8 }, () => [0, 0, 1024, 1024] as [number, number, number, number]));
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${b64(overBudget)}`)).toBe(false);
  });

  it("accepts a static 1x1 PNG and rejects APNG animation or compressed profiles", () => {
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
    expect(isSafeAvatarDataUrl(`data:image/png;base64,${b64(png)}`)).toBe(true);
    const acTL = new Uint8Array([0, 0, 0, 0, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 0]);
    const apng = new Uint8Array(png.length + acTL.length);
    apng.set(png.slice(0, 33)); apng.set(acTL, 33); apng.set(png.slice(33), 33 + acTL.length);
    expect(isSafeAvatarDataUrl(`data:image/png;base64,${b64(apng)}`)).toBe(false);
    const iccp = new Uint8Array([0, 0, 0, 5, 0x69, 0x43, 0x43, 0x50, 0x61, 0, 0, 120, 156, 0, 0, 0, 0]);
    const withProfile = new Uint8Array(png.length + iccp.length);
    withProfile.set(png.slice(0, 33)); withProfile.set(iccp, 33); withProfile.set(png.slice(33), 33 + iccp.length);
    expect(isSafeAvatarDataUrl(`data:image/png;base64,${b64(withProfile)}`)).toBe(false);
  });

  it("accepts bounded GIF, JPEG dimensions and static WebP", () => {
    const animatedGif = "R0lGODlhEAAMAIAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAEAAMAAAIGQABCBxIsKDBgwgTKlzIsKHDhxAjSpwoMCAAOw==";
    const staticWebp = "UklGRjgAAABXRUJQVlA4ICwAAADwAQCdASoQAAwAAUAmJaACdLoB+AAETAAA/vSIh/5Z8/hs49/996A3gYAAAA==";
    expect(isSafeAvatarDataUrl(`data:image/gif;base64,${animatedGif}`)).toBe(true);
    expect(isSafeAvatarDataUrl(`data:image/jpeg;base64,${b64(jpegSof(24, 16))}`)).toBe(true);
    expect(isSafeAvatarDataUrl(`data:image/webp;base64,${staticWebp}`)).toBe(true);
  });

  it("rejects animated WebP and mismatched coded dimensions", () => {
    expect(isSafeAvatarDataUrl(`data:image/webp;base64,${b64(webp(24, 24, true))}`)).toBe(false);
    const mismatched = webp(24, 24);
    mismatched[44] = 25; // VP8 coded width no longer matches the VP8X canvas.
    expect(isSafeAvatarDataUrl(`data:image/webp;base64,${b64(mismatched)}`)).toBe(false);
  });

  it("rejects remote URLs and malformed image bytes", () => {
    expect(isSafeAvatarDataUrl("https://example.test/avatar.gif")).toBe(false);
    const malformed = `data:${"image/png"};${"base64"},${"not-base64!"}`;
    expect(isSafeAvatarDataUrl(malformed)).toBe(false);
  });
});
