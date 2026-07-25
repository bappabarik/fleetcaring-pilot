import { useState } from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { enqueuePhoto } from "@/offline/photoQueue";
import { drainPhotoQueue } from "@/offline/photoQueue";
import type { UploadPurpose } from "@/api/uploads";

export interface CapturedPhoto {
  localUri: string;
  queueId: string;
}

interface PhotoCaptureGridProps {
  purpose: UploadPurpose;
  photos: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  minRequired?: number;
}

export function PhotoCaptureGrid({ purpose, photos, onChange, minRequired = 2 }: PhotoCaptureGridProps) {
  const [capturing, setCapturing] = useState(false);

  async function handleAddPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access in your device settings to add photos.");
      return;
    }

    setCapturing(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const contentType = asset.mimeType === "image/png" ? "image/png" : "image/jpeg";
      const queueId = await enqueuePhoto(asset.uri, contentType, purpose);
      onChange([...photos, { localUri: asset.uri, queueId }]);

      drainPhotoQueue();
    } finally {
      setCapturing(false);
    }
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo, index) => (
          <View key={photo.queueId} className="relative">
            <Image source={{ uri: photo.localUri }} className="h-20 w-20 rounded-lg" />
            <Pressable
              onPress={() => handleRemove(index)}
              className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-ink"
            >
              <Text className="text-xs text-white">✕</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={handleAddPhoto}
          disabled={capturing}
          className="h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-light"
        >
          <Text className="text-xs text-slate-dark">{capturing ? "…" : "+ Add"}</Text>
        </Pressable>
      </View>
      {photos.length < minRequired && (
        <Text className="mt-2 text-xs text-slate-dark">At least {minRequired} photos are required.</Text>
      )}
    </View>
  );
}