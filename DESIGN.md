# Design System — Parent Coach

## 1. Product Context

- **What this is:** A Korean mobile app that helps parents coach elementary grade 5-6 math questions without turning the app into a direct answer machine.
- **Who it is for:** Parents and guardians sitting near a child who is stuck on one math problem.
- **Project type:** iOS/Android mobile app, internal alpha stage.
- **Core memory:** The parent should see one clear place to capture the problem, then one clear first hint after confirmation.

The app is not a playful student tutor. It is a quiet preparation surface for a parent who needs to understand the problem quickly, ask one good question, and reveal help only as the child needs it.

## 2. Aesthetic Direction

- **Direction:** Monochrome Coaching Tool
- **Decoration level:** Minimal
- **Layout approach:** Grid-disciplined mobile stack
- **Color approach:** Black, white, and grayscale only
- **Motion approach:** Minimal-functional

The visual system should feel like a clear utility: open camera, confirm text, read the first useful coaching prompt. It should not feel like a landing page, a worksheet, or a colorful education app.

### Safe Choices

- Use a single-column mobile flow. Parents are likely using one hand while near the child.
- Keep action buttons familiar and direct. This is not the place for clever navigation.
- Use shape, border, and type weight instead of color to communicate hierarchy.

### Creative Risks

- Make the capture area the entire home screen focus.
- Make the first hint visible immediately after confirmed coaching, while keeping the opening question first.
- Treat final answer surfaces as deliberately quieter than the coaching path until the parent explicitly opens them.

## 3. Product Invariants In The Design

These are design constraints, not only backend rules.

- **Recognition before coaching:** No coaching card may appear before the problem confirmation screen.
- **Question before answer:** The first coaching surface must show the opening question before hint 1.
- **Hints reveal gradually:** Hint 1 may be visible by default after confirmed coaching. Hint 2 and hint 3 still require explicit actions.
- **Final answer is explicit:** The answer surface appears only after a visible `최종 풀이 보기` action.
- **Similar problem answer is folded:** The similar problem answer and solution are hidden until a separate action.
- **Unverified is never celebratory:** `unverified` or unsupported states use caution copy and restrained warning color, not success color.
- **Privacy is visible but calm:** Privacy copy should be present near image intake and feedback, but not framed as alarming unless there is an actual issue.

## 4. Typography

### Font Strategy

For the internal alpha, use platform system fonts in React Native. This keeps Korean rendering stable and avoids font-loading risk before the first phone smoke tests.

Custom fonts can be revisited after visual direction selection. If custom fonts are introduced later, they must meet these conditions:

- Korean glyph coverage or excellent Korean fallback behavior.
- Readable at 14-16px on mobile.
- No playful handwriting or decorative display font.
- No overused SaaS default as the primary identity font.

### Scale

| Token        | Size | Weight | Line Height | Usage                                   |
| ------------ | ---- | ------ | ----------- | --------------------------------------- |
| `display`    | 30px | 700    | 38px        | Home title or rare major screen title   |
| `title`      | 24px | 700    | 31px        | Current step title                      |
| `section`    | 20px | 700    | 27px        | Card title                              |
| `body`       | 16px | 400    | 24px        | Parent-readable explanation and scripts |
| `bodyStrong` | 16px | 700    | 24px        | The exact parent sentence to say        |
| `small`      | 14px | 400    | 20px        | Helper copy and secondary details       |
| `label`      | 12px | 700    | 16px        | Eyebrows, metadata, status labels       |

### Typography Rules

- Korean body text must not go below 14px.
- Parent scripts should be short and visually distinct from explanatory metadata.
- Avoid dense paragraph blocks. Prefer one script sentence, then compact supporting rows.
- Letter spacing stays `0`.
- Do not use hero-scale text inside cards.

## 5. Color

### Palette

| Role            | Token              | Value     | Usage                         |
| --------------- | ------------------ | --------- | ----------------------------- |
| App background  | `surfacePrimary`   | `#FFFFFF` | Full-screen background        |
| Card surface    | `surfaceSecondary` | `#FFFFFF` | Cards, panels, input areas    |
| Muted surface   | `surfaceMuted`     | `#F4F4F4` | Low-emphasis regions          |
| Inverse surface | `surfaceInverse`   | `#0A0A0A` | Primary buttons               |
| Text primary    | `textPrimary`      | `#0A0A0A` | Titles and body copy          |
| Text secondary  | `textSecondary`    | `#666666` | Helper text and metadata      |
| Border default  | `borderDefault`    | `#D8D8D8` | Cards, inputs, dividers       |
| Border strong   | `borderStrong`     | `#0A0A0A` | Primary focus and active card |
| Accent primary  | `accentPrimary`    | `#0A0A0A` | Primary actions and focus     |
| Status success  | `statusSuccess`    | `#0A0A0A` | Confirmed states              |
| Status warning  | `statusWarning`    | `#444444` | Caution states                |
| Status error    | `statusError`      | `#0A0A0A` | Blocking errors               |

### Color Rules

- No decorative color in the mobile app.
- Primary action is black fill with white text.
- Secondary action is white fill with black border and black text.
- Warnings and errors use text, border strength, and copy. Do not introduce amber/red unless explicitly approved.
- Do not use gradients, colorful badges, or decorative illustrations.

## 6. Spacing, Radius, And Density

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage                                     |
| ----- | ----- | ----------------------------------------- |
| `2xs` | 2px   | Hairline optical adjustment only          |
| `xs`  | 4px   | Tight icon or label gaps                  |
| `sm`  | 8px   | Compact groups, button internal gaps      |
| `md`  | 16px  | Default internal spacing                  |
| `lg`  | 24px  | Screen section gaps and card padding      |
| `xl`  | 32px  | Major screen spacing                      |
| `2xl` | 48px  | Rare large separation on home/intake only |

### Radius

| Token  | Value | Usage                           |
| ------ | ----- | ------------------------------- |
| `sm`   | 4px   | Buttons, inputs, image previews |
| `md`   | 6px   | Standard cards                  |
| `lg`   | 8px   | Major framed surfaces only      |
| `full` | 999px | Pills and circular controls     |

Cards should stay crisp. Do not make every surface bubbly.

### Density

The app should be comfortable, not spacious. Parents need quick scanning. Use generous line height but avoid oversized marketing-style spacing.

## 7. Layout System

### App Shell

- Mobile-first single column.
- Default horizontal padding: 24px.
- Default vertical padding: 32px.
- Max readable content width on larger web surfaces: 560px.
- Avoid nested cards. A card may contain rows, inputs, and actions, but not another card.

### Flow Hierarchy

Each screen should make the current step obvious:

1. Step label or status pill.
2. Screen title.
3. One sentence explaining what the parent should do now.
4. Primary action.
5. Secondary actions.

Coaching states invert the middle:

1. Step label.
2. Parent script or opening question.
3. Why this helps.
4. Next reveal action.

## 8. Components

### Screen Header

- Contains status pill, title, and one short subtitle.
- Used on home, image intake, recognition review, and recovery screens.
- Should not look like a marketing hero.

### Home Capture Card

- Follows the Cal.com-inspired A sample in `design-samples/cal-com-parent-coach`.
- Uses a restrained shadow-ring feel: white surface, light dashed border, gray icon well, and no decorative color.
- Copy stays intake-focused: one problem in frame, include diagrams or tables, then camera/photo actions.
- It must not show coaching, hints, final answers, or sample explanations before recognition confirmation.

### Coaching Card

- The most important card type.
- Structure: eyebrow, script/title, body rows, optional action.
- Parent script text may use `bodyStrong` and coaching accent.
- Use stronger type weight and border strength when the parent sentence is the primary content.

### Key-Value Row

- Good for compact explanation.
- Labels are secondary. Values carry the meaning.
- Avoid more than 4 rows in a single card unless the surface is final solution.

### Action Button

- Minimum height: 48px.
- Primary: next safe action.
- Secondary: explicit optional reveal, including final solution.
- Ghost: exit, reset, or less common path.
- Button labels must be commands, not explanations.

### Recognition Input

- Looks editable even before the user taps edit.
- Should make “this text becomes the source of truth” clear.
- Low-confidence details should be visible as helper copy or inline emphasis, not hidden in a tooltip.
- Uses the same monochrome header rhythm as home: small scope pill, direct title, one short instruction.

### Hint Step

- Each revealed hint is one card or one clearly separated section.
- Hint 1 and hint 2 must not visually resemble final answer cards.
- Hint 3 can be more concrete but still should not overpower the final reveal control.
- The coaching screen may use a stronger question surface for the opening question, but hints remain calmer secondary cards.

### Final Solution

- Uses warning or neutral framing until verified.
- The answer can be visually clear only after the explicit reveal.
- Include verification state near the top.
- Steps should be compact and scannable.

### Similar Problem

- Problem text first.
- Reason it is similar second.
- First hint third.
- Answer and solution behind a separate secondary action.

### Feedback

- Internal alpha feedback is quiet and low-pressure.
- Use fixed choices only.
- Do not introduce free text fields unless the privacy spec changes.

## 9. Motion And Interaction

### Motion Rules

- Use motion to clarify disclosure, not to entertain.
- Respect reduced motion settings.
- Default transitions should be 150-250ms.
- Allowed properties: opacity, transform, height only when layout is stable.

### Suggested Motion

| Interaction            | Motion                                      |
| ---------------------- | ------------------------------------------- |
| Hint reveal            | Fade in + 8px upward settle                 |
| Final solution reveal  | Short fade, no dramatic expansion           |
| Upload/progress states | Text/status swap, no looping decorative art |
| Button press           | Opacity or background shade change          |

## 10. Screen-Level Guidance

### Home

Home is a capture screen, not a landing page.

- The first screen centers one large problem capture area.
- Primary action: `카메라 열기`.
- Secondary action: `사진 선택`.
- Avoid feature lists, explanatory paragraphs, sample cards, or marketing-style hero copy.

### Image Intake

The intake screen should reduce privacy and cropping mistakes.

- Show one guidance card and one state card.
- Keep privacy copy close to image selection.
- Preview image must have stable height so the layout does not jump.

### Recognition Review

This is a gate. It should feel important but not scary.

- Title: `제가 이렇게 읽었어요`.
- The editable problem text is the main object.
- `맞아요` is primary only when the text is non-empty.
- Editing and retaking stay visible.

### Coaching

The coaching screen is the product.

- Opening question must be more visually prominent than metadata.
- Hint 1 is visible immediately after confirmed coaching.
- Hint 2 and hint 3 require explicit reveal actions.
- Final solution exists, but secondary.
- Feedback stays short and low-priority.

### Recovery And Unsupported States

Errors should be useful, calm, and specific.

- Tell the parent what happened.
- Tell the parent what to do next.
- Do not show a generated answer.
- Use warning for fixable issues, error only for blocking failures.

## 11. Current Direction

The active direction is **Monochrome Coaching Tool**.

Discard the earlier shotgun options as implementation targets. Future variants may explore black-on-white and white-on-black, but the current app implementation should stay white background, black primary action, black text, and gray supporting copy.

For the first implemented home screen, use the local Cal.com reference sample A as the practical layout baseline: compact scope pill, direct parent-oriented title, one large capture zone, then camera and photo actions.

## 12. Design-Review QA Checklist

Run this after visual implementation.

- Home does not look like a marketing landing page.
- First screen centers the problem capture area.
- Primary action is clear without making the app feel like an answer finder.
- Recognition confirmation visually gates coaching.
- Opening question is the most memorable coaching element.
- Hint 1 is visible on the first coaching screen.
- Hint 1 and hint 2 do not visually reveal or imply the final answer.
- Final solution is hidden until explicit action.
- Similar problem answer is hidden until explicit action.
- Warning/error/success states remain monochrome and understandable through copy.
- Korean text fits on small phones without clipping.
- Buttons keep at least 48px touch height.
- No nested cards, decorative colors, gradient blobs, colorful badges, or playful schoolroom gimmicks.

## 13. Decisions Log

| Date       | Decision                        | Rationale                                                                 |
| ---------- | ------------------------------- | ------------------------------------------------------------------------- |
| 2026-06-20 | Initial quiet study desk tokens | M0/M1 needed a calm baseline for mock parent coaching flow.               |
| 2026-06-22 | M9 Calm Coaching Desk direction | M8 app now spans upload, recognition, coaching, final solution, feedback. |
| 2026-06-22 | Custom fonts deferred           | Internal alpha phone smoke should not take on font-loading risk yet.      |
| 2026-06-22 | Three design-shotgun candidates | Visual direction should be selected before React Native polish work.      |
| 2026-06-22 | Monochrome redesign             | User chose a clearer black/white direction with less text.                |
| 2026-06-22 | Cal.com A home baseline         | User selected the local Cal.com-inspired sample A for the first screen.   |

## 14. Defaults Pending Visual Approval

These are agent-selected defaults, not final brand decisions:

- White background with black primary controls.
- System font stack for internal alpha.
- Hint 1 visible after confirmed coaching.

Revisit after phone smoke if the interface feels too stark or not parent-friendly enough.
