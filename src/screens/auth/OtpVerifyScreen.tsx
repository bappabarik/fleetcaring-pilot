import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/api/client";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";

const CODE_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 60;

export default function OtpVerifyScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, "OtpVerify">>();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { phoneNumber } = route.params;
  const setTokens = useAuthStore((s) => s.setTokens);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => authApi.verifyOtp(phoneNumber, code),
    onSuccess: async (tokens) => {
      await setTokens(tokens.accessToken, tokens.refreshToken);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert("Incorrect code", "That code is invalid or has expired. Try again or resend.");
      } else {
        Alert.alert("Something went wrong", "Please try again.");
      }
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.requestOtp(phoneNumber),
    onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
    onError: () => Alert.alert("Couldn't resend", "Please try again in a moment."),
  });

  function handleChangeDigit(value: string, index: number) {
    const char = value.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = next.join("");
    if (fullCode.length === CODE_LENGTH && next.every((d) => d !== "")) {
      verifyMutation.mutate(fullCode);
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16">
        <Pressable onPress={() => navigation.goBack()} className="mb-8 self-start">
          <Text className="text-2xl text-ink">←</Text>
        </Pressable>

        <Text className="mb-2 text-2xl font-bold text-ink">Verification code</Text>
        <Text className="mb-8 text-sm text-slate-dark">
          We've sent a code via SMS to <Text className="font-medium text-ink">{phoneNumber}</Text>
        </Text>

        <View className="mb-6 flex-row gap-3">
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              value={digit}
              onChangeText={(v) => handleChangeDigit(v, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              className="h-16 w-16 rounded-xl border border-slate-light text-center text-2xl font-semibold text-ink"
              autoFocus={index === 0}
            />
          ))}
        </View>

        {verifyMutation.isPending && <Text className="mb-4 text-sm text-slate-dark">Verifying…</Text>}

        <Pressable
          disabled={cooldown > 0 || resendMutation.isPending}
          onPress={() => resendMutation.mutate()}
          className="self-start"
        >
          <Text className={`text-sm font-medium ${cooldown > 0 ? "text-slate-dark" : "text-indigo"}`}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
