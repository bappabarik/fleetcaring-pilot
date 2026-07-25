import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pilotsApi, type NavApp, type Language } from "@/api/pilots";

const NAV_APP_OPTIONS: { value: NavApp; label: string }[] = [
  { value: "google_maps", label: "Google Maps" },
  { value: "2gis", label: "2GIS" },
  { value: "waze", label: "Waze" },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
];

function SettingsRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <View className="border-b border-slate-light/60 py-4">
      <Text className="mb-2 text-sm font-medium text-slate-dark">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`rounded-full border px-4 py-2 ${
              value === option.value ? "border-indigo bg-indigo/10" : "border-slate-light"
            }`}
          >
            <Text className={value === option.value ? "font-medium text-indigo" : "text-ink"}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({ queryKey: ["pilot-profile"], queryFn: pilotsApi.getMe });

  const updateMutation = useMutation({
    mutationFn: pilotsApi.updateMe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pilot-profile"] }),
  });

  if (profileQuery.isLoading || !profileQuery.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-dark">Loading…</Text>
      </SafeAreaView>
    );
  }

  const profile = profileQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4">
        <Text onPress={() => navigation.goBack()} className="mb-4 text-2xl text-ink">
          ←
        </Text>
        <Text className="mb-6 text-xl font-bold text-ink">Settings</Text>

        <SettingsRow
          label="Language"
          value={profile.language}
          options={LANGUAGE_OPTIONS}
          onSelect={(value) => updateMutation.mutate({ language: value as Language })}
        />

        <SettingsRow
          label="Navigation"
          value={profile.preferredNavApp}
          options={NAV_APP_OPTIONS}
          onSelect={(value) => updateMutation.mutate({ preferredNavApp: value as NavApp })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}   