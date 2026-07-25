import { View, Text } from "react-native";
import { Truck, MapPin } from "lucide-react-native";

export function AssetCard({ plateCode }: { plateCode: string }) {
  return (
    <View className="flex-1 rounded-xl bg-paper p-3">
      <View className="mb-3 h-16 items-center justify-center rounded-lg bg-indigo/10">
        <Truck color="#3652D9" size={28} />
      </View>
      <Text className="text-xs text-slate-dark">Assigned asset</Text>
      <Text className="text-sm font-bold text-ink">{plateCode}</Text>
    </View>
  );
}

export function ZoneCard({ zoneName }: { zoneName: string }) {
  return (
    <View className="flex-1 rounded-xl bg-paper p-3">
      <View className="mb-3 h-16 items-center justify-center rounded-lg bg-emerald/10">
        <MapPin color="#1F9D6C" size={28} />
      </View>
      <Text className="text-xs text-slate-dark">Assigned zone</Text>
      <Text className="text-sm font-bold text-ink">{zoneName}</Text>
    </View>
  );
}