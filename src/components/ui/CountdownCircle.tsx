import { View, Text } from "react-native";

interface CountdownCircleProps {
  label: string;
  value: string;
}

export function CountdownCircle({ label, value }: CountdownCircleProps) {
  return (
    <View className="h-56 w-56 items-center justify-center rounded-full border-[6px] border-indigo-light/30 self-center">
      <View className="h-48 w-48 items-center justify-center rounded-full border-[6px] border-indigo">
        <Text className="text-xs text-slate-dark">{label}</Text>
        <Text className="text-3xl font-bold text-ink">{value}</Text>
      </View>
    </View>
  );
}