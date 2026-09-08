import React from "react";
import { Text, View } from "react-native";
import { Input } from "./Input";

export interface RichTextEditorProps {
  value: string;
  onChangeText: (html: string) => void;
  placeholder?: string;
}

/**
 * Native fallback for the "about" page editor: a plain multiline text field editing raw
 * HTML, since the web version's contentEditable-based toolbar has no RN equivalent without
 * a dedicated native rich-text library (out of scope for this pass - see
 * RichTextEditor.web.tsx for the real editing experience, which is what apps/web uses).
 */
export function RichTextEditor({ value, onChangeText, placeholder }: RichTextEditorProps) {
  return (
    <View className="w-full gap-1">
      <Input
        label="Treść (HTML)"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
      />
      <Text className="font-sans text-[12px] text-muted">
        Edytor rich-text jest dostępny na razie tylko w wersji web — tutaj wpisz treść jako HTML.
      </Text>
    </View>
  );
}
