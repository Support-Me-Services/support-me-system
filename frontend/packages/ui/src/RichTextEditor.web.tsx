import React, { useEffect, useRef } from "react";
import { View } from "react-native";

export interface RichTextEditorProps {
  /** Current HTML content (only re-applied to the DOM when it changes from OUTSIDE an edit, e.g. initial load). */
  value: string;
  /** Called with the editor's current innerHTML after every edit. */
  onChangeText: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR_ACTIONS: Array<{ command: string; label: string; arg?: string }> = [
  { command: "bold", label: "B" },
  { command: "italic", label: "I" },
  { command: "insertUnorderedList", label: "•" },
  { command: "formatBlock", label: "H2", arg: "H2" },
];

/**
 * Web-only rich-text editor for the organization "about" page content. Uses a plain
 * `contentEditable` div + `document.execCommand` rather than a full ProseMirism/TipTap
 * setup - `execCommand` is deprecated-but-still-supported in every evergreen browser and
 * this is a deliberately lightweight MVP; swap for a proper editor library if richer
 * formatting is needed later. The backend re-sanitizes whatever HTML this produces
 * (OWASP Java HTML Sanitizer, allowlist-based) before it's ever stored or served to guests,
 * so this editor doesn't need to be a trusted security boundary itself.
 */
export function RichTextEditor({
  value,
  onChangeText,
  placeholder,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastExternalValue = useRef<string>(value);

  // Only overwrite the DOM when `value` changed for a reason OTHER than this editor's
  // own onInput (e.g. loading a different organization) - otherwise every keystroke
  // would reset the DOM and the caret position along with it.
  useEffect(() => {
    if (editorRef.current && value !== lastExternalValue.current) {
      editorRef.current.innerHTML = value;
    }
    lastExternalValue.current = value;
  }, [value]);

  const runCommand = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML ?? "";
    lastExternalValue.current = html;
    onChangeText(html);
  };

  return (
    <View className="w-full gap-[7px]">
      <View className="flex-row gap-1 rounded-t-card border border-b-0 border-line bg-band px-2 py-2">
        {TOOLBAR_ACTIONS.map((action) => (
          // Plain DOM <button>, not RN's Pressable: a Pressable's mousedown steals focus from
          // the contentEditable BEFORE onPress fires, which clears the browser's text
          // selection - so document.execCommand would run with nothing selected. Confirmed by
          // a real failure: clicking "Bold" after selecting text did nothing. preventDefault()
          // on mousedown keeps the contentEditable's selection intact through the click.
          <button
            key={action.command + (action.arg ?? "")}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(action.command, action.arg)}
            className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-sans text-[13px] font-semibold text-foreground hover:bg-line"
          >
            {action.label}
          </button>
        ))}
      </View>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="min-h-[220px] w-full rounded-b-card border border-line bg-background px-[14px] py-[12px] font-sans text-[16px] text-foreground outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]"
      />
    </View>
  );
}
