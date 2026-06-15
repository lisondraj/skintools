import type { AutofillMode } from "./types";

export interface AIAction {
  mode: AutofillMode;
  label: string;
  description: string;
  needsSelection?: boolean;
  needsPrompt?: boolean;
}

/** Quick AI actions for a selected text box (full element). */
export const TEXT_AI_ACTIONS: AIAction[] = [
  { mode: "rewrite", label: "Rewrite", description: "Clearer patient-friendly wording" },
  { mode: "expand", label: "Expand", description: "Add helpful detail" },
  { mode: "shorten", label: "Shorten", description: "Trim to essentials" },
  { mode: "simplify", label: "Simplify", description: "Plain language for patients" },
  { mode: "clinical", label: "Clinical", description: "Professional medical tone" },
  { mode: "bullets", label: "Bullets", description: "Convert to bullet points" },
  { mode: "grammar", label: "Fix grammar", description: "Spelling and grammar" },
  { mode: "summarize", label: "Summarize", description: "Condense to key points" },
];

/** AI actions that require a highlighted text selection. */
export const SELECTION_AI_ACTIONS: AIAction[] = [
  { mode: "edit-selection", label: "Apply edit", description: "Edit selection with your instruction", needsPrompt: true },
  { mode: "rewrite", label: "Rewrite selection", description: "Rewrite only the highlighted text" },
  { mode: "simplify", label: "Simplify selection", description: "Plain language for highlighted text" },
  { mode: "clinical", label: "Clinical tone", description: "Medical tone for selection" },
  { mode: "shorten", label: "Shorten selection", description: "Trim highlighted text" },
];
