# TASK-20260719-communication-image-cjk-font

## Context

Downloaded parent reminder images rendered Chinese characters as hexadecimal/tofu boxes in production and split English words across lines. The same generator appeared acceptable on a developer Mac because macOS supplied a fallback Chinese font, while the Ubuntu production server had only DejaVu fonts and no Chinese glyph coverage.

## Root cause

- The SVG named `PingFang SC` and `Noto Sans CJK SC` but the application did not bundle a font or guarantee either family on the server.
- Production `fc-list :lang=zh` returned no font, confirming configuration drift between local and production rendering.
- The wrapping helper cut every 29 JavaScript characters, ignoring glyph width, Chinese/English differences and word boundaries.
- The prior regression test checked only PNG format, dimensions and byte size, so a 1080×1440 image full of missing-glyph boxes still passed.

## Change

- Make the server deployment install `fontconfig` and Ubuntu's `fonts-noto-cjk` package only when no Chinese font is present.
- Fail deployment if `Noto Sans CJK SC` cannot be verified after installation.
- Render share-image SVG text with the verified Noto family first.
- Replace fixed character-count wrapping with mixed Chinese/English display-width wrapping that preserves English words.
- Allow a two-line title, move the separator/body accordingly and cap body lines above the footer.
- Add regression coverage for word preservation and the production font guarantee.

## Non-goals

- No reminder content, recipient, task status or notification timing changed.
- No parent, teacher, Session, attendance, package, finance, payroll or scheduling data changed.
- No mini-program page or web page layout changed.

## Verification

- Re-rendered a current production reminder record locally; Chinese glyphs, English words, title, body and footer rendered correctly.
- Focused parent-communication tests passed, including the two new regression checks.
- Deployment-shell syntax and TypeScript checks passed; all 86 backend regression tests passed; the production build completed successfully with 208 routes/pages.
- After deployment, production matched `Noto Sans CJK SC`; a real parent reminder generated a visually verified 1080×1440 PNG without tofu boxes or broken English words. Runtime feature commit `5aa3627` aligned across local/GitHub/server, PM2 PID `2400607` remained online and `/admin/login` returned HTTP 200.

## Risk

Low. The code change is isolated to PNG presentation and the deployment adds only an open-source system font package when missing. Existing notification and business-write paths are unchanged.

## Rollback

Roll back to `79d8dee` if rendering or deployment regresses. The installed font package can remain safely installed because it does not alter business data or application permissions.
