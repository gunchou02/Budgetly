# Soft Glass Buddy

Budgetly's visual direction is a friendly lavender glass piggy bank with a calm,
readable household ledger. The mascot accompanies the user; balances and primary
actions remain the most prominent functional elements.

## Shared design tokens

`frontend/src/styles.css` is the source of truth for color, radius and shadow tokens.

| Role | Token / value |
| --- | --- |
| Canvas | `--budgetly-canvas`: `#f6f3fc` |
| Data surfaces | `--budgetly-surface`: white |
| Text | `--budgetly-ink`: `#302344` |
| Primary action | `--budgetly-accent`: `#7350c4` |
| Secondary text | `--budgetly-muted`: `#6b5f7d` |
| Borders | `--budgetly-line`: `#e8e1f2` |
| Small / medium / large radius | 10 / 14 / 22 px |

Use frosted surfaces for navigation and summary panels. Forms, transaction lists
and charts use near-opaque surfaces. Keep status labels in addition to status
colors. Decorative illustrations have empty alt text; navigation retains named
Lucide icons for readability at small sizes. CSS motion respects reduced-motion
preferences. No WebGL or animation library is needed.

## Assets

Production assets are in `frontend/public/brand/glass/`:

- `mascot.webp`: lavender glass piggy-bank companion (720 px)
- `wallet.webp`: budget illustration (400 px)
- `receipt.webp`: recurring-cost illustration (400 px)
- `chart.webp`: reports illustration (400 px)
- `mark.webp`: small brand mark (96 px)

All preserve transparency, use Next.js Image sizing, and total approximately
146 KiB before responsive image optimization. The app icon, favicon, Apple touch
icon and manifest icons are derived from the same mascot. Maskable icons keep
the character within the central safe area.

Generation used the built-in image generation tool with the approved concept
board as the style reference. Original generated PNGs are preserved outside the
repository; optimized WebP files above are the runtime assets.

### Final mascot prompt

> Use case: stylized-concept. Create a single production website mascot asset, using the pig character in the provided Budgetly concept board as the visual identity reference. Output ONLY one large adorable frosted lavender glass piggy bank, 3/4 view facing slightly left toward viewer, tiny glossy dark plum bead eyes, gentle smile, round snout, small ears and four stubby legs. A peach coin entering the top slot, one peach coin visible inside its semi-translucent milky body. Match the character closely. High-end soft studio render, frosted glass mixed with jelly, beautifully rounded, gentle lilac highlights, no harsh rainbow. Full character including coin entirely in frame, centered with 8% margin, fills most of square image. Genuinely TRANSPARENT background with alpha, no environment, no typography, no UI, no extra objects, no ground plane. A small soft contact shadow is okay. This is a standalone asset for use on very pale lavender and white panels.

### Final icon prompt template

> Use case: stylized-concept. Create ONE standalone production website 3D icon asset for Budgetly. The provided image is a STYLE REFERENCE ONLY; match its bottom-left icon materials, soft highlights and color palette. Subject: {subject}. Cute rounded premium frosted glass and soft jelly aesthetic. Entire object centered within a square canvas, fill 80% of image, no cropping. Soft diffuse studio lighting from upper left. Genuinely transparent background with alpha, no backdrop, no typography, no labels, no UI, no extra objects, very subtle contact shadow only. Consistent lavender, pale apricot and mint material system.

Subjects, one generation per icon:

- Wallet: `a small rounded wallet in frosted lavender glass, folded top opening, a rounded front flap and one peach circular button, slight 3/4 view`
- Receipt: `one friendly curled receipt scroll made of frosted milky lavender glass, four subtle raised lavender horizontal lines (no actual text), a softly zigzag bottom edge, slight 3/4 view`
- Chart: `a sculptural thick donut chart standing upright, made of frosted glass, large lavender segment with two smaller mint and peach segments, slight 3/4 view`

## Responsive behavior

- Desktop: a wordmark-only sidebar, balance plus mascot, recent expenses on the left and category breakdown on the right. No calendar or sidebar mascot.
- Tablet: compact header and frosted bottom navigation; budget and recurring-cost panels remain side by side when readable.
- Mobile: compact illustrations, stacked transaction list and category chart, and a scrollable expense-entry dialog.
- Authentication: introduction beside the form on wide screens; compact brand and mascot above the form on small screens.

## UI feedback

Budget forms distinguish loading from an unset budget. Budget and recurring-cost
forms disable submission while saving. Empty states guide the next action.
Global loading uses the companion with a short loading label. A skip link moves
keyboard focus to the main content.

## Verification — 2026-09-26

- TypeScript, ESLint and production build passed.
- Vitest: 15 tests passed; the API integration suite was skipped because
  `BUDGETLY_INTEGRATION_BASE_URL` was not configured.
- Browser checks: login, registration, dashboard, budgets, subscriptions and
  reports at 375, 768 and 1280 px. No horizontal document overflow or broken
  visible images was detected.
- Guest flow: the redesigned dashboard was checked against the real API for
  expense creation, editing, deletion, month changes and the monthly list. Budget and
  subscription forms were also verified during the initial visual refresh.
- Keyboard behavior: expense entry uses a native modal dialog, focuses amount
  on opening and restores focus on closing. The dialog stays mounted while
  hidden so an in-progress receipt is retained when the user closes it.
- Core color pairs exceed 4.5:1: secondary text on the lavender panel 4.72:1,
  white on the primary button 5.72:1. This is a targeted check, not a complete
  accessibility audit.
- README screenshots in `docs/images/*-glass*.jpg` were refreshed from the
  running app using an isolated guest account. They contain only illustrative
  data; the guest account was removed through the logout API after capture.
  Development tool overlays were hidden for these product screenshots.
- Member-only receipt OCR and AI requests were not exercised. Their shared
  visual styles were updated, but external-provider flows were outside this
  visual verification.
- The local environment lacked `RATE_LIMIT_KEY_SECRET`. A random key was passed
  only to the development process for verification; environment files were
  not modified. Configure a persistent secret before running guest mode in a
  new local process.

## Local runtime isolation

Docker keeps Next.js build output in the `frontend-next` volume, separate from
the host's `frontend/.next` directory. This prevents macOS build artifacts from
being reused by the Linux development server. After the cache separation, the
login page retained its document and input value during a 15-second check, and
guest entry reached a stable dashboard. See [Docker troubleshooting](docker.md).
