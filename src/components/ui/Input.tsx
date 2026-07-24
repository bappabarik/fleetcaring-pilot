import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <View className="flex-col gap-1.5">
      {label && <Text className="text-sm font-medium text-slate-dark">{label}</Text>}
      <TextInput
        placeholderTextColor="#8891A5"
        className={`rounded-xl border px-4 py-3.5 text-base text-ink ${
          error ? "border-rust" : "border-slate-light"
        } ${className}`}
        {...props}
      />
      {error && <Text className="text-xs text-rust">{error}</Text>}
    </View>
  );
}
