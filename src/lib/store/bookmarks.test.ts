import { beforeEach, describe, expect, it } from "vitest";
import { catalog, soloLevelingChapters } from "@/test/catalog";
import { bookmarksFor, isBookmarked, removeBookmark, resetBookmarks, toggleBookmark } from "./bookmarks";

// Solo Leveling chapters 1 and 2 as the live unified list returns them (one AsuraScan version each)
const [ch1, ch2] = soloLevelingChapters;
const v1 = ch1!.variants[0]!;
const base = { titleKey: catalog[0]!.key, chapterId: ch1!.id, chapterLabel: ch1!.label, page: 3, pageCount: 14, variantId: v1.variantId, sourceId: v1.sourceId };

describe("bookmarks", () => {
  beforeEach(() => {
    localStorage.clear();
    resetBookmarks();
  });
  it("toggles a page bookmark and persists it", () => {
    expect(toggleBookmark(base)).toBe(true);
    expect(isBookmarked(base.titleKey, base.chapterId, 3)).toBe(true);
    expect(JSON.parse(localStorage.getItem("dawghwa.bookmarks.v1")!)[base.titleKey]).toHaveLength(1);
    expect(toggleBookmark(base)).toBe(false);
    expect(isBookmarked(base.titleKey, base.chapterId, 3)).toBe(false);
  });
  it("keys by canonical chapter key, so any version of that chapter finds the bookmark", () => {
    toggleBookmark(base);
    expect(isBookmarked(base.titleKey, ch1!.id, 3)).toBe(true);
    expect(isBookmarked(base.titleKey, ch2!.id, 3)).toBe(false);
  });
  it("removes a specific bookmark and keeps newest first", () => {
    toggleBookmark(base);
    toggleBookmark({ ...base, page: 5 });
    expect(bookmarksFor(base.titleKey).map((b) => b.page)).toEqual([5, 3]);
    removeBookmark(base.titleKey, base.chapterId, 5);
    expect(bookmarksFor(base.titleKey).map((b) => b.page)).toEqual([3]);
  });
});
