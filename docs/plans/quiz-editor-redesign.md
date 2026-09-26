# Quiz Editor Redesign Checklist

Branch:

`feature/quiz-editor-redesign`

## Goal

Transform the existing quiz editor into the new full-screen editor layout incrementally.

The work should be split into many focused commits.

The redesign should follow this order:

1. Change the page structure and layout.
2. Move existing functionality into the correct sections.
3. Establish clean component boundaries.
4. Improve each editor section independently.
5. Apply the final visual design and polish last.

Do not try to reproduce the complete redesigned mockup in one change.

---

# Phase 1 — Establish the page layout

## [ ] 1. Switch the quiz editor to the full-bleed page layout

Use the full available application workspace instead of the existing narrow centered layout.

Requirements:

- Use the existing `fullBleed` page layout.
- Remove the narrow content constraint from the quiz editor.
- Keep all existing editor functionality working.
- Do not redesign individual controls yet.
- Do not introduce the final card/surface styling yet.

Suggested commit:

`refactor(quiz-creator): introduce full-bleed editor layout`

---

## [ ] 2. Create the main three-column editor workspace

Restructure the page into three primary regions:

- Left: question navigator.
- Center: question editor.
- Right: question settings.

Target structure:

    Editor header

    Question navigator | Question editor | Question settings

    Question navigation

Requirements:

- Establish the layout only.
- Keep the existing controls and behavior intact.
- Allow the regions to use placeholder/simple styling initially.
- Do not redesign the answer editor yet.
- Do not redesign the question navigator yet.
- Do not add final spacing, shadows, colors, or decorative surfaces yet.

Suggested commit:

`refactor(quiz-creator): split editor into primary workspace regions`

---

## [ ] 3. Create the persistent bottom question navigation

Move question traversal into a dedicated footer below the main editor workspace.

The footer should contain:

- Previous question action.
- Current question index and total count.
- Next question action.

Example:

    Previous question        Question 1 of 3        Next question

Requirements:

- Preserve existing previous/next question behavior.
- Keep the footer separate from the primary question editor.
- Do not visually polish the footer yet.

Suggested commit:

`refactor(quiz-creator): move question navigation into persistent footer`

---

# Phase 2 — Establish component boundaries

## [ ] 4. Extract the editor header

Create a dedicated component for page-level quiz actions.

The header should contain:

- Quiz title.
- Settings.
- Preview, if currently supported.
- Save.
- Exit.

Requirements:

- Preserve existing behavior.
- Keep question-specific controls out of the header.
- Do not significantly redesign the individual controls yet.

Suggested component:

`QuizEditorHeader`

Suggested commit:

`refactor(quiz-creator): extract editor header`

---

## [ ] 5. Extract the question navigator

Create a dedicated component for navigating between questions.

Responsibilities:

- Display the quiz questions.
- Show which question is active.
- Allow selecting another question.
- Preserve existing question ordering behavior.
- Preserve existing question creation behavior where applicable.

Requirements:

- Move existing functionality without changing behavior.
- Do not fully redesign the question items yet.

Suggested component:

`QuestionNavigator`

Suggested commit:

`refactor(quiz-creator): extract question navigator`

---

## [ ] 6. Extract the main question editor

Create a dedicated component for editing the active question content.

The region should eventually contain:

- Question content.
- Media.
- Answer options.

Requirements:

- Move existing functionality without changing behavior.
- Do not redesign the answer options yet.
- Keep configuration such as time limit and points outside this component once those fields are moved.

Suggested component:

`QuestionEditor`

Suggested commit:

`refactor(quiz-creator): extract question editor`

---

## [ ] 7. Extract the question settings panel

Create a dedicated component for question configuration.

The region should eventually contain:

- Question type.
- Time limit.
- Points.
- Additional content / info.
- Advanced settings.
- Question deletion.

Requirements:

- Establish the component boundary first.
- Existing controls may remain visually unchanged initially.

Suggested component:

`QuestionSettings`

Suggested commit:

`refactor(quiz-creator): extract question settings`

---

## [ ] 8. Extract the bottom question navigation

Move the bottom navigation into its own component.

Responsibilities:

- Previous question.
- Current question position.
- Next question.

Suggested component:

`QuestionNavigation`

Suggested commit:

`refactor(quiz-creator): extract question navigation`

---

# Phase 3 — Move existing functionality into the correct regions

## [ ] 9. Move question type into the settings panel

Move the existing question type selector from the primary editor area into `QuestionSettings`.

Requirements:

- Preserve the existing question type behavior.
- Preserve validation and state handling.
- Do not redesign the selector yet.

Suggested commit:

`refactor(quiz-creator): move question type into settings panel`

---

## [ ] 10. Move time limit into the settings panel

Move the existing time limit control into `QuestionSettings`.

Requirements:

- Preserve existing values.
- Preserve existing state handling.
- Do not visually redesign the control yet.

Suggested commit:

`refactor(quiz-creator): move time limit into settings panel`

---

## [ ] 11. Move points into the settings panel

Move the existing points control into `QuestionSettings`.

Requirements:

- Preserve existing values and behavior.
- Keep the existing points model unchanged.
- Do not visually redesign the control yet.

Suggested commit:

`refactor(quiz-creator): move points into settings panel`

---

## [ ] 12. Move additional information into the settings panel

Move the existing question info/additional content field into `QuestionSettings`.

Create a logical "Additional content" section for it.

Requirements:

- Preserve existing state and persistence behavior.
- Do not introduce new content fields as part of this step.
- Do not redesign the input significantly yet.

Suggested commit:

`refactor(quiz-creator): move additional content into settings panel`

---

## [ ] 13. Move advanced settings into the settings panel

Move the existing advanced question settings into `QuestionSettings`.

Requirements:

- Preserve all current advanced settings.
- Do not introduce new settings.
- Do not turn the section into an accordion yet unless it is already one.

Suggested commit:

`refactor(quiz-creator): move advanced settings into settings panel`

---

## [ ] 14. Move question deletion into the settings panel

Place the existing delete-question action at the bottom of the settings area.

Requirements:

- Preserve current confirmation and deletion behavior.
- Keep it visually separate from ordinary settings.
- Do not change deletion semantics.

Suggested commit:

`refactor(quiz-creator): move question deletion into settings panel`

---

# Phase 4 — Redesign the question navigator

## [ ] 15. Replace the existing top question thumbnails with a left sidebar

Transform the current question navigation into the vertical sidebar used by the new layout.

Each question item should be able to show:

- Question number.
- Question label/title.
- Question type.
- Active/selected state.

Requirements:

- Keep question selection behavior unchanged.
- Make the active question visually clear.
- Remove the old horizontal/floating question navigation presentation.
- Do not add unrelated functionality.

Suggested commit:

`feat(quiz-creator): redesign question navigator`

---

## [ ] 16. Add the quiz title area to the navigator

Add the quiz title/header area at the top of the left navigator.

It should support the existing quiz title/edit behavior where appropriate.

Requirements:

- Reuse existing quiz title state.
- Do not duplicate title state between the header and navigator.
- Keep ownership of quiz metadata clear.

Suggested commit:

`feat(quiz-creator): add quiz header to question navigator`

---

## [ ] 17. Redesign the add-question action

Replace the current question-add presentation with a clear sidebar action.

Requirements:

- Add a prominent "Add question" action.
- Preserve existing question creation behavior.
- Keep the action within the navigator.

Suggested commit:

`feat(quiz-creator): redesign question creation action`

---

## [ ] 18. Add slide creation if already supported by the domain

If the application already supports slides/non-question content, expose that action in the navigator.

Requirements:

- Use existing functionality.
- Do not introduce a new slide domain model as part of the redesign.
- Skip this task if slides do not already exist.

Suggested commit:

`feat(quiz-creator): add slide creation action to navigator`

---

## [ ] 19. Refine question reordering in the sidebar

Adapt existing drag-and-drop/reordering behavior to the vertical question navigator.

Requirements:

- Preserve the current ordering semantics.
- Provide an appropriate drag handle.
- Ensure selection still works independently of dragging.
- Add or update tests for reordering.

Suggested commit:

`refactor(quiz-creator): adapt question reordering to navigator`

---

# Phase 5 — Redesign the primary question editor

## [ ] 20. Redesign the question content area

Replace the current small question input presentation with the larger central question editing area.

Requirements:

- Make the question text the primary focus of the editor.
- Preserve existing validation.
- Preserve existing question state handling.
- Keep keyboard and focus behavior working.
- Do not change the underlying question data model.

Suggested commit:

`feat(quiz-creator): redesign question content editor`

---

## [ ] 21. Move the question type indicator into the editor header area

The central editor may display the current question type near the "Question" heading for context.

Requirements:

- Treat this as a presentation of the active question type.
- Do not create duplicate conflicting state.
- The actual configuration control should remain in the settings panel.

Suggested commit:

`feat(quiz-creator): show question type in editor header`

---

# Phase 6 — Redesign media handling

## [ ] 22. Replace the single "Add media" action with explicit media actions

Provide clearer media actions such as:

- Add image.
- Add video.
- Add audio.
- Add GIF.

Only expose media types already supported by the application.

Requirements:

- Reuse existing media behavior.
- Do not add unsupported media types just because they exist in the mockup.
- Keep this change focused on presentation and interaction.

Suggested commit:

`feat(quiz-creator): redesign question media actions`

---

## [ ] 23. Add a dedicated media area

Create a clear media region below the question input.

Requirements:

- Display existing attached media.
- Provide an empty state when no media is attached.
- Support existing media selection/removal behavior.
- Only add drag-and-drop upload if the current application supports it or it is implemented as a separate explicit feature.

Suggested commit:

`feat(quiz-creator): add dedicated question media area`

---

# Phase 7 — Redesign the answer editor

## [ ] 24. Change multiple-choice answers to a vertical list

Replace the current two-column answer layout with a vertical answer list.

Requirements:

- Preserve existing answer state.
- Preserve existing validation.
- Preserve correct-answer selection.
- Preserve ordering.
- Do not change answer semantics.

Suggested commit:

`feat(quiz-creator): redesign multiple choice answer layout`

---

## [ ] 25. Add visual answer identifiers

Give each answer a clear visual identifier such as:

- A.
- B.
- C.
- D.

Use the existing Klurigo visual system where possible.

Requirements:

- Identifiers must not become part of persisted answer text.
- Identifiers should follow answer order.

Suggested commit:

`style(quiz-creator): add answer option identifiers`

---

## [ ] 26. Redesign correct-answer selection

Replace the current correct-answer control presentation with a clearer interaction.

Requirements:

- Preserve single-correct-answer behavior where applicable.
- Preserve multi-correct-answer behavior where applicable.
- Keep accessible labels and keyboard interaction.
- Do not change correctness rules as part of the visual redesign.

Suggested commit:

`feat(quiz-creator): redesign correct answer controls`

---

## [ ] 27. Add answer-level delete actions

Provide an explicit delete action for removable answers.

Requirements:

- Respect minimum-answer constraints.
- Preserve existing deletion behavior.
- Disable or hide deletion where an answer cannot legally be removed.

Suggested commit:

`feat(quiz-creator): redesign answer deletion controls`

---

## [ ] 28. Adapt answer reordering to the new layout

Move answer drag handles into the new vertical answer rows.

Requirements:

- Preserve ordering semantics.
- Make drag handles visually clear.
- Ensure input interaction does not accidentally initiate dragging.

Suggested commit:

`refactor(quiz-creator): adapt answer reordering to redesigned editor`

---

## [ ] 29. Add answer-level media controls if already supported

Expose existing answer-media functionality directly from each answer row.

Requirements:

- Do not introduce new answer-media capabilities in this redesign task.
- Reuse existing upload/removal behavior.

Suggested commit:

`feat(quiz-creator): expose answer media controls`

---

## [ ] 30. Add the "Add another answer" action

Provide a clear action below the answer list.

Requirements:

- Respect maximum-answer constraints.
- Preserve existing answer creation behavior.
- Disable the action when no additional answers can be added.

Suggested commit:

`feat(quiz-creator): redesign add answer action`

---

## [ ] 31. Improve answer validation presentation

Replace the current repeated large validation banners with validation presentation that fits the redesigned answer rows.

Requirements:

- Preserve all existing validation rules.
- Avoid rendering the same quiz-level error repeatedly for every answer when the error applies to the answer group.
- Keep field-specific errors attached to the relevant field.
- Keep errors accessible.

Suggested commit:

`refactor(quiz-creator): improve answer validation presentation`

---

# Phase 8 — Redesign the settings panel

## [ ] 32. Apply the new settings panel structure

Organize the right-hand settings panel into clear groups.

Suggested structure:

    Question settings
    - Question type
    - Time limit
    - Points

    Additional content
    - Info / explanation

    Advanced
    - Advanced question options

    Delete question

Requirements:

- Do not change the underlying settings behavior.
- Keep related settings grouped together.

Suggested commit:

`feat(quiz-creator): redesign question settings panel`

---

## [ ] 33. Make advanced settings collapsible

Convert the advanced settings area into a collapsible section.

Requirements:

- Preserve all current advanced settings.
- Keep the default state sensible.
- Ensure controls remain accessible when expanded.
- Add tests for expanding and collapsing the section.

Suggested commit:

`feat(quiz-creator): add collapsible advanced settings`

---

## [ ] 34. Redesign the delete-question action

Give the delete action a clear destructive presentation at the bottom of the settings panel.

Requirements:

- Use existing destructive design tokens/components.
- Preserve confirmation behavior.
- Keep it visually separated from normal settings.

Suggested commit:

`style(quiz-creator): refine question deletion action`

---

# Phase 9 — Redesign the editor header

## [ ] 35. Refine the quiz title control

Adjust the quiz title input so it fits naturally in the new editor header.

Requirements:

- Preserve validation.
- Preserve save behavior.
- Avoid allowing it to dominate the header visually.

Suggested commit:

`style(quiz-creator): refine quiz title control`

---

## [ ] 36. Refine header actions

Align and normalize the header actions:

- Settings.
- Preview.
- Save.
- Exit.

Requirements:

- Use consistent button sizing.
- Use appropriate action hierarchy.
- Make Save the primary action where appropriate.
- Keep Exit visually distinct without making it destructive.
- Preserve existing behavior.

Suggested commit:

`style(quiz-creator): refine editor header actions`

---

## [ ] 37. Add preview action if the functionality already exists

If preview functionality already exists elsewhere, expose it from the editor header.

Requirements:

- Reuse existing preview functionality.
- Do not implement a completely new preview system as part of the layout redesign.
- Skip this task if there is no existing preview capability.

Suggested commit:

`feat(quiz-creator): expose quiz preview from editor header`

---

# Phase 10 — Apply the visual system

## [ ] 38. Apply consistent editor workspace surfaces

Introduce consistent surfaces for:

- Question navigator.
- Question editor.
- Question settings.
- Bottom navigation where appropriate.

Requirements:

- Prefer reusable existing surface primitives/mixins.
- Use the shared `Surface` component if it has been introduced and is appropriate.
- Avoid duplicating the same surface SCSS across multiple editor sections.
- Keep interactive and non-interactive surfaces visually distinct.

Suggested commit:

`style(quiz-creator): apply editor workspace surfaces`

---

## [ ] 39. Apply the editor background treatment

Introduce the lighter workspace background shown by the redesign direction instead of using the old solid primary background for the entire editing area.

Requirements:

- Use existing design tokens.
- Ensure surfaces remain visually distinct from the page background.
- Maintain sufficient contrast.

Suggested commit:

`style(quiz-creator): refine editor workspace background`

---

## [ ] 40. Refine spacing throughout the editor

Normalize:

- Panel padding.
- Gaps between sections.
- Form field spacing.
- Header spacing.
- Answer row spacing.
- Footer spacing.

Requirements:

- Use the existing spacing system/tokens.
- Avoid arbitrary one-off spacing values where tokens already exist.

Suggested commit:

`style(quiz-creator): refine editor spacing`

---

## [ ] 41. Refine editor typography

Improve hierarchy between:

- Page-level information.
- Section headings.
- Field labels.
- Supporting text.
- Question text.
- Answer text.

Requirements:

- Reuse the existing typography system.
- Avoid introducing editor-specific font sizes without a clear reason.

Suggested commit:

`style(quiz-creator): refine editor typography`

---

## [ ] 42. Refine borders and shadows

Apply consistent borders and elevation to the editor surfaces.

Requirements:

- Use existing color/elevation tokens.
- Avoid excessive shadowing.
- Keep nested components visually understandable.

Suggested commit:

`style(quiz-creator): refine editor borders and elevation`

---

## [ ] 43. Refine interactive states

Review and improve:

- Hover states.
- Focus states.
- Active states.
- Selected question state.
- Disabled controls.
- Dragging states.
- Destructive actions.

Requirements:

- Maintain keyboard-visible focus.
- Do not rely exclusively on color to communicate state.

Suggested commit:

`style(quiz-creator): polish editor interaction states`

---

# Phase 11 — Responsive behavior

## [ ] 44. Define responsive behavior for the three-column workspace

The desktop layout should remain:

    Question navigator | Question editor | Question settings

For smaller widths, define an intentional alternative rather than allowing the columns to collapse accidentally.

Requirements:

- Determine appropriate breakpoints using the existing responsive system.
- Prevent the central editor from becoming unusably narrow.
- Keep all editor functionality reachable.

Suggested commit:

`feat(quiz-creator): add responsive editor workspace`

---

## [ ] 45. Adapt the question navigator for smaller screens

Define how question navigation should work when the full left sidebar cannot remain visible.

Possible approaches include:

- Collapsible sidebar.
- Drawer.
- Compact question selector.

Requirements:

- Choose an approach consistent with existing Klurigo patterns.
- Preserve question selection and creation.
- Do not duplicate desktop and mobile editor state.

Suggested commit:

`feat(quiz-creator): adapt question navigator for smaller screens`

---

## [ ] 46. Adapt question settings for smaller screens

Define how the right settings panel behaves when there is insufficient horizontal space.

Possible approaches include:

- Move below the editor.
- Collapsible panel.
- Drawer.

Requirements:

- Keep settings reachable.
- Preserve state while opening/closing the settings UI.
- Avoid shrinking the main question editor excessively.

Suggested commit:

`feat(quiz-creator): adapt question settings for smaller screens`

---

## [ ] 47. Adapt the bottom navigation for smaller screens

Ensure previous/next navigation remains usable on constrained widths.

Requirements:

- Keep both navigation directions accessible.
- Keep the current question position visible where practical.
- Avoid horizontal overflow.

Suggested commit:

`style(quiz-creator): adapt question navigation for smaller screens`

---

# Phase 12 — Tests and cleanup

## [ ] 48. Update component tests throughout the redesign

As components are extracted and redesigned:

- Move tests with their components where appropriate.
- Preserve behavioral coverage.
- Add tests for new interaction paths.
- Avoid replacing meaningful behavioral assertions with snapshot-only tests.

This should happen continuously throughout the branch rather than only at the end.

---

## [ ] 49. Update editor snapshots

Update snapshots only after the intended structural/visual changes are complete.

Requirements:

- Review snapshot changes manually.
- Do not blindly accept snapshots.
- Verify that removed UI was intentionally removed.

Suggested commit if needed:

`test(quiz-creator): update redesigned editor snapshots`

---

## [ ] 50. Add or update responsive tests

Add coverage for important constrained viewport scenarios.

At minimum verify:

- Header actions remain reachable.
- Question navigation remains reachable.
- Question settings remain reachable.
- Question content remains editable.
- Answer controls do not overflow.
- Save and Exit remain reachable.

Suggested commit:

`test(quiz-creator): cover responsive editor layout`

---

## [ ] 51. Run the complete frontend test suite

Before considering the redesign complete, run the full `klurigo-web` test suite.

This must include all existing relevant checks used by the project, including:

- Unit/component tests.
- Type checking.
- Linting.
- Formatting checks.
- Production build.
- Frontend E2E tests.

Do not consider the redesign complete based only on tests covering the changed components.

Fix any regressions introduced by the redesign before continuing.

---

## [ ] 52. Perform final cleanup

Review the completed implementation for:

- Dead CSS.
- Obsolete old-layout components.
- Duplicate styling.
- Duplicate layout logic.
- Unused props.
- Unused imports.
- Temporary compatibility code.
- Old question-navigation styles.
- Old narrow-layout assumptions.
- Unnecessary wrappers introduced during the migration.

Suggested commit:

`refactor(quiz-creator): clean up legacy editor layout`

---

## [ ] 53. Perform final visual review

Compare the completed editor against the intended redesign direction.

Review:

- Overall page hierarchy.
- Header.
- Question navigator.
- Main editor.
- Question settings.
- Answer editor.
- Media area.
- Bottom navigation.
- Spacing.
- Surfaces.
- Typography.
- Interactive states.
- Validation.
- Responsive behavior.

Do not require pixel-perfect reproduction of the mockup if doing so conflicts with existing Klurigo design primitives or functionality.

The final result should feel like a native evolution of Klurigo rather than an isolated mockup copied into the application.

---

# Agent Rules

For every checklist item:

1. Work on only the current checklist item.
2. Inspect the existing implementation before changing it.
3. Preserve existing behavior unless the checklist explicitly requires a behavior change.
4. Do not opportunistically redesign unrelated parts of the editor.
5. Do not introduce unrelated abstractions.
6. Add or update tests when behavior or component boundaries change.
7. Run the relevant tests before committing.
8. Make one focused commit for the completed checklist item.
9. Do not combine several future checklist items into the same commit.
10. Do not proceed to the next checklist item while the current implementation is broken.
11. Prefer existing Klurigo components, design tokens, mixins, and interaction patterns.
12. Do not copy visual details from the mockup when they conflict with existing Klurigo primitives.
13. Keep the application functional after every commit.
14. Treat the mockup as the target design direction, not as permission to redesign unrelated application behavior.
15. Run the complete frontend test suite before the branch is considered finished.

# Expected End State

The finished quiz editor should have:

- A full-bleed editor workspace.
- A dedicated editor header.
- A persistent left-side question navigator on desktop.
- A large central question editing surface.
- A dedicated right-side question settings panel.
- A persistent bottom question navigation area.
- Clear media controls.
- A vertically structured answer editor.
- Clear correct-answer controls.
- Better validation presentation.
- Grouped question settings.
- Responsive behavior for constrained viewports.
- Consistent Klurigo surfaces, spacing, typography, and interaction states.
- Existing quiz editing behavior preserved unless explicitly changed by one of the checklist items.
