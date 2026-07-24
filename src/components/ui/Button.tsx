import { Pressable, Text, ActivityIndicator, type PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: "bg-indigo active:bg-indigo-dark", text: "text-white" },
  secondary: { bg: "bg-white active:bg-paper border border-slate-light", text: "text-ink" },
  danger: { bg: "bg-rust active:bg-rust-light", text: "text-white" },
};

interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ label, variant = "primary", loading, disabled, className = "", ...props }: ButtonProps) {
  const styles = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 ${styles.bg} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={variant === "secondary" ? "#12151C" : "#FFFFFF"} />}
      <Text className={`text-base font-semibold ${styles.text}`}>{label}</Text>
    </Pressable>
  );
}
