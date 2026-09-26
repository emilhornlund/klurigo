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

## [x] 1. Switch the quiz editor to the full-bleed page layout

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

## [x] 2. Create the main three-column editor workspace

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

## [x] 3. Create the persistent bottom question navigation

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

# Phase 2 — Establish repo-aligned editor boundaries

## [x] 4. Extract the page header actions into `QuizEditorHeader`

Move the existing quiz title and page-level actions from the inline `Page.header` JSX into a dedicated component.

The component must contain the existing:

- Quiz title field.
- Quiz settings action.
- Save action.
- Exit action.

Requirements:

- Preserve the existing `QuizSettingsModal` behavior.
- Preserve the existing save/loading/disabled behavior.
- Preserve the existing mobile behavior for the title and button labels.
- Keep quiz-level settings separate from question-level settings.
- Do not introduce a Preview action.
- Do not move the quiz title into the question navigator.

Suggested location:

`QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader`

Suggested commit:

`refactor(quiz-creator): extract editor header`

---

## [x] 5. Extract the bottom navigation into `QuestionNavigation`

Move the footer introduced in task 3 into a dedicated component.

Responsibilities:

- Previous question.
- Current question position.
- Next question.

Requirements:

- Preserve the current selected-question index behavior.
- Disable Previous on the first question.
- Disable Next on the last question.
- Keep it hidden while `AdvancedQuestionEditor` is active.
- Keep it integrated through the existing `Page.footer` API.

Suggested location:

`QuizCreatorPage/components/QuizCreatorPageUI/components/QuestionNavigation`

Suggested commit:

`refactor(quiz-creator): extract question navigation`

---

## [x] 6. Introduce the `QuestionSettings` component boundary

Replace the current placeholder right-hand panel with a dedicated `QuestionSettings` component.

Do not move fields yet.

The initial component should establish the boundary and receive only the data/actions required for the currently selected question.

Requirements:

- Reuse the existing selected `QuizQuestionModel`.
- Reuse the existing `QuizQuestionValidationResult`.
- Reuse `onQuestionValueChange`.
- Reuse `onReplaceQuestion` where required.
- Do not introduce separate duplicated question state.
- Do not introduce an "advanced settings" model.
- Do not modify `AdvancedQuestionEditor`.

Suggested location:

`QuizCreatorPage/components/QuizCreatorPageUI/components/QuestionSettings`

Suggested commit:

`refactor(quiz-creator): introduce question settings panel`

---

# Phase 3 — Move existing common question fields

The existing `QuestionEditor` must remain the main dispatcher for the supported question types.

Do not replace or re-extract it.

The current editor supports:

- Classic multiple choice.
- Classic range.
- Classic true/false.
- Classic type answer.
- Classic pin.
- Classic puzzle.
- Zero-to-one-hundred range.

Only move fields that already exist.

---

## [x] 7. Move question type selection into `QuestionSettings`

Move the existing `QuestionFieldType.CommonType` control from `QuestionEditor` into the right-hand settings panel.

Requirements:

- Only show it where question type selection is currently supported.
- Preserve the existing `onReplaceQuestion` behavior.
- Preserve all existing replacement/reset semantics.
- Preserve validation.
- Remove the old type control from `QuestionEditor`.
- Do not duplicate the selector in both places.

Suggested commit:

`refactor(quiz-creator): move question type into settings panel`

---

## [x] 8. Move duration into `QuestionSettings`

Move the existing `QuestionFieldType.CommonDuration` control from the question-type forms into the settings panel.

Requirements:

- Show the control only for question types that currently expose `duration`.
- Preserve the current value and validation.
- Continue updating the existing `duration` field through `onQuestionValueChange`.
- Remove the corresponding duration field from each affected `QuestionForm`.
- Do not change duration semantics or allowed values.

Suggested commit:

`refactor(quiz-creator): move question duration into settings panel`

---

## [x] 9. Move points into `QuestionSettings`

Move `QuestionFieldType.CommonPoints` into the settings panel for question types that currently support points.

Requirements:

- Do not assume every question type has points.
- Preserve the existing question model exactly.
- Preserve existing validation.
- Continue updating the existing `points` field.
- Remove the old points control from the affected question forms.

In particular, do not add points to question types where the current editor does not expose them.

Suggested commit:

`refactor(quiz-creator): move question points into settings panel`

---

## [x] 10. Move question info into `QuestionSettings`

Move the existing `QuestionFieldType.CommonInfo` field into the settings panel.

Requirements:

- Preserve the existing `info` property.
- Preserve current validation and persistence.
- Do not create new explanation/content fields.
- Remove the old info field from each affected question form.
- Use a clear section heading such as `Additional content`.

Suggested commit:

`refactor(quiz-creator): move question info into settings panel`

---

## [x] 11. Move question deletion into `QuestionSettings`

Relocate the existing delete-question action from `QuestionPicker` into the bottom of the settings panel.

Requirements:

- Preserve the existing confirmation dialog behavior and message.
- Preserve the minimum-one-question restriction.
- Reuse the existing `onDeleteQuestionIndex`.
- Delete the currently selected question.
- Remove the duplicate delete action from `QuestionPicker`.
- Keep duplication in the navigator.
- Keep deletion visually separate from ordinary fields.

Suggested commit:

`refactor(quiz-creator): move question deletion into settings panel`

---

# Phase 4 — Adapt the existing `QuestionPicker` into the left navigator

Do not replace `QuestionPicker` with a second navigation implementation.

The redesign should evolve the existing component.

---

## [x] 12. Convert `QuestionPicker` from horizontal navigation to a vertical sidebar

Change the existing question picker presentation to fit the left workspace column.

Each item must continue to expose the information already available:

- Question number.
- Question text/fallback label.
- Question type.
- Active state.
- Validation state.

Requirements:

- Preserve question selection.
- Preserve validation indication.
- Preserve duplication.
- Preserve drag-and-drop reordering.
- Preserve the add-question action.
- Remove assumptions that navigation scrolls horizontally.
- Update selected-question auto-scroll behavior for a vertical container.
- Do not introduce a second navigator component with duplicated state.

Suggested commit:

`feat(quiz-creator): adapt question picker to sidebar navigation`

---

## [ ] 13. Adapt question reordering to the vertical navigator

Update the existing question drag-and-drop behavior for the new sidebar layout.

Requirements:

- Preserve `onDropQuestionIndex`.
- Preserve question ordering semantics.
- Keep normal question selection separate from dragging.
- Preserve keyboard accessibility where currently supported.
- Add/update behavioral tests for reordering in the vertical layout.

Suggested commit:

`refactor(quiz-creator): adapt question reordering to sidebar`

---

## [ ] 14. Redesign the add-question action in the navigator

Adapt the existing `onAddQuestion` action to the sidebar.

Requirements:

- Keep the existing game-mode-specific creation behavior.
- Do not add new question types.
- Do not introduce slide creation.
- Keep the action visually distinct from existing questions.
- Keep it within `QuestionPicker`.

Suggested commit:

`style(quiz-creator): refine question creation action`

---

## [ ] 15. Refine navigator question actions

Adapt existing per-question actions to the new vertical item design.

Preserve:

- Duplicate question.
- Validation indication.
- Active selection.

Deletion is no longer part of the navigator after task 11.

Requirements:

- Do not remove duplication.
- Do not introduce new question actions.
- Ensure actions do not interfere with drag-and-drop or selection.

Suggested commit:

`style(quiz-creator): refine navigator question actions`

---

# Phase 5 — Restructure the existing `QuestionEditor`

The existing `QuestionEditor` remains responsible for selecting the appropriate question-type form.

The existing question-type-specific forms remain responsible for their domain-specific fields.

---

## [ ] 16. Establish a consistent content layout inside `QuestionEditor`

Refactor the existing question forms so their remaining editor content fits the new central workspace.

After tasks 7–10, the center should primarily contain:

- Question text.
- Existing media controls where supported.
- Question-type-specific answer/configuration controls.

Requirements:

- Keep all existing question models unchanged.
- Preserve the current `QuestionField` abstraction.
- Do not collapse all question types into one generic form.
- Keep each existing question-type form independently testable.

Suggested commit:

`refactor(quiz-creator): align question forms with editor workspace`

---

## [ ] 17. Redesign the question text area

Refine the existing `QuestionFieldType.CommonQuestion` presentation so the question text becomes the primary focus of the center editor.

Requirements:

- Preserve the existing `question` field.
- Preserve validation.
- Preserve keyboard/focus behavior.
- Use existing Klurigo input primitives.
- Do not change question-length rules or persistence.

Suggested commit:

`style(quiz-creator): refine question text editor`

---

# Phase 6 — Redesign existing media handling

## [ ] 18. Redesign `MediaQuestionField`

Update the existing media editor presentation to fit the new central workspace.

Requirements:

- Work with the media types and behavior already implemented by `MediaQuestionField`.
- Preserve existing media selection, editing and removal behavior.
- Preserve existing validation.
- Do not add image/video/audio/GIF capabilities unless they already exist in the current component.
- Do not introduce a parallel media model.

Suggested commit:

`feat(quiz-creator): redesign question media editor`

---

## [ ] 19. Preserve Pin-specific image editing separately

The Pin question does not use the normal `CommonMedia` flow.

Keep its existing:

- Image URL.
- Position.
- Tolerance-related editing.

Requirements:

- Do not force Pin questions through `MediaQuestionField`.
- Preserve the existing `PinQuestionField`.
- Adapt its layout to the new editor without changing its model.

Suggested commit:

`style(quiz-creator): adapt pin question editor layout`

---

# Phase 7 — Redesign existing answer and question-type controls

## [ ] 20. Redesign multiple-choice options using the existing `MultiChoiceOptions`

Update the presentation of the existing multiple-choice option editor.

Preserve:

- `QUIZ_MULTI_CHOICE_OPTIONS_MIN`.
- `QUIZ_MULTI_CHOICE_OPTIONS_MAX`.
- Correct-answer checkboxes.
- Multiple correct answers.
- Existing validation.
- Existing local stable option IDs.
- Existing trailing-empty-option behavior.
- Existing `@dnd-kit` reordering.

Requirements:

- Use a vertical answer-row layout.
- Keep the existing data model.
- Do not introduce a separate "Add answer" state model.
- Do not introduce explicit delete semantics unless implemented as a separate feature.

Suggested commit:

`feat(quiz-creator): redesign multiple choice options`

---

## [ ] 21. Adapt multiple-choice drag-and-drop to the redesigned rows

Update the existing `@dnd-kit` layout for vertical answer rows.

Requirements:

- Preserve Mouse, Touch and Keyboard sensors.
- Preserve focus restoration after dragging.
- Preserve option ordering.
- Keep the drag handle distinct from text input interaction.
- Update behavioral tests.

Suggested commit:

`refactor(quiz-creator): adapt answer reordering to vertical rows`

---

## [ ] 22. Improve multiple-choice validation presentation

Refine how existing multiple-choice validation is displayed.

Requirements:

- Preserve all existing validation rules.
- Keep option-specific errors attached to their relevant option.
- Avoid visually repeating the same group-level error on every row where possible.
- Keep errors accessible.
- Do not change validation semantics.

Suggested commit:

`refactor(quiz-creator): refine multiple choice validation`

---

## [ ] 23. Redesign true/false controls

Adapt the existing `TrueFalseOptions` component to the new central editor layout.

Requirements:

- Preserve the current `correct` field.
- Preserve validation.
- Do not convert it to the multiple-choice data model.
- Keep the interaction accessible.

Suggested commit:

`style(quiz-creator): redesign true false controls`

---

## [ ] 24. Redesign type-answer controls

Adapt the existing `TypeAnswerOptions` component to the new central editor layout.

Requirements:

- Preserve existing option semantics.
- Preserve validation.
- Preserve the current question model.
- Do not reuse multiple-choice behavior where the domain differs.

Suggested commit:

`style(quiz-creator): redesign type answer controls`

---

## [ ] 25. Redesign range question controls

Adapt the existing Classic Range controls:

- Minimum.
- Maximum.
- Correct answer.
- Margin.

Requirements:

- Preserve `calculateRangeBounds`.
- Preserve `calculateRangeStep`.
- Preserve `QuestionRangeAnswerMargin`.
- Preserve the existing explanatory footer for accepted ranges.
- Keep range-specific fields in the central editor rather than treating them as generic question settings.
- Preserve validation.

Suggested commit:

`style(quiz-creator): redesign range question controls`

---

## [ ] 26. Redesign zero-to-one-hundred range controls

Adapt the existing Zero-to-One-Hundred Range editor.

Requirements:

- Preserve the fixed 0–100 domain.
- Preserve the existing `correct` field.
- Preserve duration through the settings panel.
- Do not add points if the current model/editor does not expose points.
- Preserve validation.

Suggested commit:

`style(quiz-creator): redesign zero to one hundred controls`

---

## [ ] 27. Redesign puzzle controls

Adapt the existing `PuzzleValues` editor to the new central layout.

Requirements:

- Preserve the existing puzzle data model.
- Preserve validation.
- Do not redesign puzzle semantics.
- Do not replace the existing component unless there is a concrete implementation reason.

Suggested commit:

`style(quiz-creator): redesign puzzle controls`

---

## [ ] 28. Finish Pin-specific controls

Adapt the remaining Pin-specific configuration to the redesigned central editor.

Keep these Pin-specific fields in the central editor:

- Pin image.
- Pin position.
- Pin tolerance.

Move only the existing common question fields into `QuestionSettings`:

- Duration.
- Points.
- Info.

Requirements:

- Preserve the existing `PinQuestionField`.
- Preserve position and tolerance semantics.
- Preserve validation.
- Do not move Pin-specific fields into `QuestionSettings`.
- Do not force Pin questions through `MediaQuestionField`.
- Do not change the Pin question model.

Suggested commit:

`style(quiz-creator): refine pin question controls`

---

# Phase 8 — Finish the question settings panel

## [ ] 29. Apply the final `QuestionSettings` structure

Organize the right-hand panel around fields that actually exist.

Example structure:

    Question settings
    - Question type
    - Duration
    - Points (only where supported)

    Additional content
    - Info

    Delete question

Requirements:

- Render controls conditionally from the selected question type.
- Do not show unsupported fields.
- Do not introduce an `Advanced` section.
- Do not move `AdvancedQuestionEditor` into this panel.
- Keep the panel driven by the existing selected-question state.

Suggested commit:

`feat(quiz-creator): finalize question settings panel`

---

# Phase 9 — Preserve and integrate the existing advanced JSON editor

## [ ] 30. Preserve `AdvancedQuestionEditor` as a separate editor mode

The existing advanced editor is a JSON editor for the complete questions array.

It must remain conceptually separate from `QuestionSettings`.

Requirements:

- Preserve the `Show Advanced Editor` / `Show Simple Editor` behavior.
- Preserve `parseQuestionsJson`.
- Preserve JSON validation feedback.
- Preserve synchronization between JSON edits and question state.
- Keep the three-column simple editor hidden while advanced mode is active.
- Keep bottom question navigation hidden while advanced mode is active.
- Do not rename it to "Advanced settings".

Suggested commit:

`refactor(quiz-creator): integrate advanced editor with redesigned layout`

---

## [ ] 31. Refine the advanced editor presentation

Adapt the existing JSON editor visually to the new full-bleed page.

Requirements:

- Keep the existing `Textarea type="code"` implementation.
- Preserve its current data flow.
- Preserve validation behavior.
- Do not redesign the JSON editing feature itself.

Suggested commit:

`style(quiz-creator): refine advanced question editor`

---

# Phase 10 — Refine the page header and quiz settings integration

## [ ] 32. Refine the quiz title control

Adapt the existing header title field to the redesigned page.

Requirements:

- Keep the title in the editor header.
- Preserve existing validation.
- Preserve mobile behavior.
- Preserve save/unsaved-change tracking.
- Do not duplicate the title in the question navigator.

Suggested commit:

`style(quiz-creator): refine quiz title control`

---

## [ ] 33. Refine Settings, Save and Exit actions

Apply consistent visual hierarchy to the existing actions.

Requirements:

- Preserve `QuizSettingsModal`.
- Preserve Save disabled/loading behavior.
- Preserve Exit navigation and unsaved-changes blocking.
- Do not introduce Preview.
- Keep all actions reachable on constrained widths.

Suggested commit:

`style(quiz-creator): refine editor header actions`

---

# Phase 11 — Apply the Klurigo visual system

## [ ] 34. Apply reusable surfaces to the editor workspace

Apply existing Klurigo surface primitives to:

- Question navigator.
- Main question editor.
- Question settings.
- Bottom navigation where appropriate.

Requirements:

- Prefer the existing `Surface` component where appropriate.
- Reuse existing surface-box/design primitives.
- Avoid duplicating equivalent SCSS between the three regions.
- Distinguish interactive and non-interactive surfaces.

Suggested commit:

`style(quiz-creator): apply editor workspace surfaces`

---

## [ ] 35. Refine workspace background and spacing

Apply the intended full-screen workspace treatment.

Requirements:

- Use existing color tokens.
- Use existing semantic spacing tokens.
- Keep surfaces distinguishable from the page background.
- Avoid one-off pixel values where existing tokens are suitable.

Suggested commit:

`style(quiz-creator): refine editor workspace styling`

---

## [ ] 36. Refine editor typography

Review hierarchy for:

- Quiz title.
- Section headings.
- Question text.
- Field labels.
- Answer text.
- Supporting text.
- Validation messages.

Requirements:

- Reuse the existing typography system.
- Avoid introducing unnecessary editor-specific font sizes.

Suggested commit:

`style(quiz-creator): refine editor typography`

---

## [ ] 37. Refine interaction states

Review:

- Hover.
- Focus.
- Selected question.
- Validation state.
- Disabled actions.
- Dragging.
- Destructive delete action.

Requirements:

- Preserve keyboard-visible focus.
- Do not rely only on color.
- Reuse existing interaction tokens/patterns.

Suggested commit:

`style(quiz-creator): polish editor interaction states`

---

# Phase 12 — Responsive behavior

## [ ] 38. Define responsive behavior for the workspace

Desktop remains:

    Question navigator | Question editor | Question settings

Define intentional behavior for smaller viewports using the existing Klurigo responsive helpers.

Requirements:

- Do not simply shrink all three columns until unusable.
- Preserve access to every editor function.
- Keep the central question editor usable.
- Reuse existing breakpoints/helpers.

Suggested commit:

`feat(quiz-creator): add responsive editor workspace`

---

## [ ] 39. Adapt the question navigator for constrained widths

Define how the existing `QuestionPicker` behaves when a permanent sidebar no longer fits.

Requirements:

- Preserve selection.
- Preserve creation.
- Preserve duplication.
- Preserve reordering where practical.
- Preserve validation indication.
- Do not maintain a separate mobile question state.

Suggested commit:

`feat(quiz-creator): adapt question navigator for smaller screens`

---

## [ ] 40. Adapt question settings for constrained widths

Define how `QuestionSettings` remains reachable without making the central editor unusably narrow.

Requirements:

- Preserve selected-question state.
- Preserve all currently applicable settings.
- Do not duplicate settings state between desktop and mobile UI.
- Use an interaction consistent with existing Klurigo patterns.

Suggested commit:

`feat(quiz-creator): adapt question settings for smaller screens`

---

## [ ] 41. Adapt header and footer controls for constrained widths

Verify:

- Settings remains reachable.
- Save remains reachable.
- Exit remains reachable.
- Previous remains reachable.
- Next remains reachable.
- Current question position remains visible where practical.

Requirements:

- Avoid horizontal overflow.
- Preserve the existing mobile button-label behavior where appropriate.

Suggested commit:

`style(quiz-creator): adapt editor navigation for smaller screens`

---

# Phase 13 — Tests and cleanup

## [ ] 42. Update tests alongside every structural change

Do not defer behavioral coverage until the end.

Preserve or add coverage for:

- Question selection.
- Question creation.
- Question duplication.
- Question deletion.
- Question reordering.
- Previous/next navigation.
- Question type replacement.
- Duration updates.
- Points updates where supported.
- Info updates.
- Save state.
- Advanced/simple editor switching.
- JSON editor synchronization.
- Unsaved-change behavior.

Do not replace behavioral tests with snapshots alone.

---

## [ ] 43. Add coverage for every supported question editor

Verify the redesigned editor for:

- Classic MultiChoice.
- Classic Range.
- Classic TrueFalse.
- Classic TypeAnswer.
- Classic Pin.
- Classic Puzzle.
- ZeroToOneHundred Range.

The tests must verify that fields remain connected to the same underlying question properties after being moved or redesigned.

Suggested commit:

`test(quiz-creator): cover redesigned question editors`

---

## [ ] 44. Add responsive editor coverage

At minimum verify constrained layouts keep these functions reachable:

- Header actions.
- Question selection.
- Add question.
- Main question input.
- Question settings.
- Previous/next navigation.
- Save.
- Exit.

Suggested commit:

`test(quiz-creator): cover responsive editor layout`

---

## [ ] 45. Review and update snapshots

Update snapshots only after intended structural changes are complete.

Requirements:

- Review every changed snapshot.
- Do not blindly accept snapshot updates.
- Verify that removed controls were intentionally relocated rather than lost.
- Verify advanced editor snapshots separately from the simple editor.

Suggested commit:

`test(quiz-creator): update redesigned editor snapshots`

---

## [ ] 46. Remove obsolete old-layout styling

Remove code made unnecessary by the redesign.

Review specifically:

- Horizontal `QuestionPicker` layout assumptions.
- Old question-picker scrolling behavior.
- Old `QuestionEditor` section layout styles.
- Duplicate workspace styling.
- Temporary placeholder settings content.
- Compatibility wrappers introduced during migration.
- Unused props/imports.

Requirements:

- Do not remove existing domain behavior while cleaning layout code.
- Keep the component hierarchy consistent with the rest of `QuizCreatorPage`.

Suggested commit:

`refactor(quiz-creator): clean up legacy editor layout`

---

## [ ] 47. Run the complete frontend verification

Before considering the redesign complete, run the complete `klurigo-web` verification used by the repository.

Include:

- Unit/component tests.
- Type checking.
- Linting.
- Formatting checks.
- Production build.
- Frontend E2E tests.

Do not consider the branch complete based only on `QuizCreatorPage` tests.

Fix regressions before continuing.

---

## [ ] 48. Perform final repository-grounded review

Review the implementation against both the redesign direction and the actual editor behavior.

Verify:

- `QuizCreatorPage` data flow remains unchanged unless intentionally required.
- `QuestionDataSource` remains the authoritative question state.
- `QuizSettingsDataSource` remains the authoritative quiz-settings state.
- `QuestionEditor` still dispatches all supported question types.
- `QuestionPicker` still owns navigation/reordering/duplication behavior.
- `QuestionSettings` only contains real existing question properties.
- `AdvancedQuestionEditor` remains the whole-question-array JSON editor.
- `QuizSettingsModal` remains quiz-level settings.
- No existing question type loses editable fields.
- No unsupported fields or capabilities were invented.
- Save/exit/unsaved-change behavior remains intact.

The finished editor should feel like a redesign of the existing Klurigo editor, not a replacement implementation built from the mockup.

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
