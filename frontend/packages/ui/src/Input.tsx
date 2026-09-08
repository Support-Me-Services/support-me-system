import React from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

/** Maps to Figma's "FormField" component (Default/Focus/Error states). */
export interface InputProps
  extends Pick<
    TextInputProps,
    | "value"
    | "onChangeText"
    | "placeholder"
    | "secureTextEntry"
    | "multiline"
    | "keyboardType"
    | "autoCapitalize"
    | "editable"
  > {
  /** Field label, shown above the input. */
  label: string;
  /** Marks the label with a required-field asterisk. */
  required?: boolean;
  /** Validation error message; switches the field into its "Error" visual state. */
  error?: string;
}

export function Input({
  label,
  required = false,
  error,
  multiline = false,
  ...inputProps
}: InputProps) {
  const isError = Boolean(error);

  return (
    <View className="w-full gap-[7px]">
      <Text className="font-sans text-[14px] font-semibold text-foreground">
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor="#5b6678"
        className={`w-full rounded-card border bg-background px-[14px] py-[12px] font-sans text-[16px] text-foreground ${
          multiline ? "min-h-[120px]" : "h-[46px]"
        } ${isError ? "border-danger" : "border-line focus:border-primary"}`}
      />
      {isError ? (
        <Text className="font-sans text-[13px] text-danger">{error}</Text>
      ) : null}
    </View>
  );
}
