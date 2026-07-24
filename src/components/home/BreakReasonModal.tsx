import { Modal, View, Text, Pressable } from "react-native";
import type { BreakReason } from "@/api/shifts";

const REASON_OPTIONS: { value: BreakReason; label: string }[] = [
  { value: "LUNCH_BREAK", label: "Lunch/Break" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "MECHANICAL_ISSUE", label: "Mechanical Issue" },
  { value: "SICKNESS", label: "Sickness while on duty" },
  { value: "RETURN_TO_DEPOT", label: "Return to depot" },
  { value: "OTHER", label: "Other" },
];

interface BreakReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (reason: BreakReason) => void;
}

export function BreakReasonModal({ visible, onClose, onSelect }: BreakReasonModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable className="mt-auto rounded-t-2xl bg-white p-5" onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink">Off-duty reason</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-xl text-slate-dark">✕</Text>
            </Pressable>
          </View>

          {REASON_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              className="flex-row items-center justify-between border-b border-slate-light/60 py-4"
            >
              <Text className="text-base text-ink">{option.label}</Text>
              <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-slate-light">
                {option.value === "LUNCH_BREAK" && <View className="h-2.5 w-2.5 rounded-full bg-indigo" />}
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}