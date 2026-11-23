import { UndoRedo } from "@tiptap/extensions";
import { redo, undo } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import { AddMarkStep, RemoveMarkStep } from "@tiptap/pm/transform";

/**
 * prosemirror-history 1.5 puts the redo cursor at the end of changed marks.
 * Formatting a selection should keep that selection in KNOT. Restore the marked
 * span on redo; text insertion/deletion retains ProseMirror's cursor semantics.
 * The native history still owns grouping, input rules and undo bookmarks.
 */
export const SelectionHistory = UndoRedo.extend({
  addCommands() {
    return {
      undo:
        () =>
        ({ state, dispatch }) =>
          undo(state, dispatch),
      redo:
        () =>
        ({ state, dispatch }) =>
          redo(
            state,
            dispatch
              ? (transaction) => {
                  if (
                    transaction.steps.length &&
                    transaction.steps.every(
                      (step) =>
                        step instanceof AddMarkStep ||
                        step instanceof RemoveMarkStep,
                    )
                  ) {
                    const steps = transaction.steps as (
                      AddMarkStep | RemoveMarkStep
                    )[];
                    const from = Math.min(...steps.map((step) => step.from));
                    const to = Math.max(...steps.map((step) => step.to));
                    transaction.setSelection(
                      TextSelection.create(
                        transaction.doc,
                        state.selection.anchor > state.selection.head
                          ? to
                          : from,
                        state.selection.anchor > state.selection.head
                          ? from
                          : to,
                      ),
                    );
                  }
                  dispatch(transaction);
                }
              : undefined,
          ),
    };
  },
});
