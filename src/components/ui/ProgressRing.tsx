import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ProgressRingProps {
  label: string;
  value: string;
  progress: number;
  size?: number;
}

export function ProgressRing({ label, value, progress, size = 224 }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center self-center">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#EDEFF3" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3652D9"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text className="text-xs text-slate-dark">{label}</Text>
      <Text className="text-3xl font-bold text-ink">{value}</Text>
    </View>
  );
}