# Comment composer and list

Owner: whoever builds comments (local-only in cycle 1). Uses tokens, Toast, BottomSheet.

## Composer

- Collapsed: a 48px field-looking button "Add a comment" (`--surface-3`, 1px `--control-line`), avatar 32px left. Tap expands in place (phone: becomes a sticky bottom composer above the keyboard; desktop: inline).
- Expanded: `<textarea>` with visible label "Comment" (sr-only allowed if the heading "Comments" is adjacent and `aria-labelledby` set), auto-grow 2-6 rows, max 500 chars, counter shown within 50 of the limit.
- Spoiler: a `.switch` "Contains spoilers" under the field.
- Actions: "Post" (green, the only fill; `aria-disabled` while empty with helper "Write something first" on attempt), "Cancel" text button. Ctrl/Cmd+Enter posts.
- Incognito: composer replaced with the line "Comments are off in Incognito." (no field).
- Posting: in-button pending; success inserts the comment at top with focus moved to it and toast "Comment posted"; failure keeps the text and shows alert toast "Couldn't post. Try again."

## List

- Each comment: avatar 32px, name Small 600, time Small `--ink-3` (`<time>`), body Body `--ink-2`, actions row (Like 44px with count text, Reply, More).
- Spoiler comments: body hidden behind a `--surface-2` block with "Spoiler. Show" button (`aria-expanded`); text `--ink` (spoiler label light 17+:1).
- Empty: "No comments yet" (Heading) + "Be the first to say something." No mascot.
- Delete own comment via More sheet, with Undo toast 8s.
- Heading level: "Comments" `<h2>` with count "Comments (12)" only when known.
