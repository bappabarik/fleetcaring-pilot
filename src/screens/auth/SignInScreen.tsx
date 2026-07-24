import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/api/client";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";

type Tab = "phone" | "email";

const COUNTRY_CODE = "+971";

export default function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [tab, setTab] = useState<Tab>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailOrCode, setEmailOrCode] = useState("");
  const [password, setPassword] = useState("");

  const requestOtpMutation = useMutation({
    mutationFn: () => authApi.requestOtp(`${COUNTRY_CODE}${phoneNumber}`),
    onSuccess: () => {
      navigation.navigate("OtpVerify", { phoneNumber: `${COUNTRY_CODE}${phoneNumber}` });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert("Not found", "No pilot account exists for this phone number. Contact your supervisor.");
      } else {
        Alert.alert("Something went wrong", "Please try again.");
      }
    },
  });

  const passwordLoginMutation = useMutation({
    mutationFn: () => authApi.loginWithPassword(emailOrCode, password),
    onSuccess: async (tokens) => {
      await setTokens(tokens.accessToken, tokens.refreshToken);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert("Invalid credentials", "Check your email/Pilot ID and password and try again.");
      } else {
        Alert.alert("Something went wrong", "Please try again.");
      }
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-6 pt-16">
          <View className="mb-10 flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-indigo">
              <Text className="text-lg font-extrabold text-white">F</Text>
            </View>
            <Text className="text-xl font-bold text-ink">FleetCaring Pilot</Text>
          </View>

          <Text className="mb-6 text-2xl font-bold text-ink">Sign in</Text>

          <View className="mb-6 flex-row rounded-xl bg-paper p-1">
            <Pressable
              onPress={() => setTab("phone")}
              className={`flex-1 items-center rounded-lg py-2.5 ${tab === "phone" ? "bg-white" : ""}`}
            >
              <Text className={`font-medium ${tab === "phone" ? "text-ink" : "text-slate-dark"}`}>Phone</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("email")}
              className={`flex-1 items-center rounded-lg py-2.5 ${tab === "email" ? "bg-white" : ""}`}
            >
              <Text className={`font-medium ${tab === "email" ? "text-ink" : "text-slate-dark"}`}>Email</Text>
            </Pressable>
          </View>

          {tab === "phone" ? (
            <View className="gap-4">
              <View className="flex-col gap-1.5">
                <Text className="text-sm font-medium text-slate-dark">Phone Number</Text>
                <View className="flex-row items-center gap-2">
                  <View className="rounded-xl border border-slate-light px-3 py-3.5">
                    <Text className="text-base text-ink">{COUNTRY_CODE}</Text>
                  </View>
                  <Input
                    className="flex-1"
                    placeholder="5XXXXXXXX"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </View>
              <Button
                label="Sign in"
                loading={requestOtpMutation.isPending}
                disabled={phoneNumber.length < 8}
                onPress={() => requestOtpMutation.mutate()}
              />
            </View>
          ) : (
            <View className="gap-4">
              <Input
                label="Email or Pilot ID"
                placeholder="you@fleetcaring.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={emailOrCode}
                onChangeText={setEmailOrCode}
              />
              <Input
                label="Password"
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Button
                label="Sign in"
                loading={passwordLoginMutation.isPending}
                disabled={!emailOrCode || !password}
                onPress={() => passwordLoginMutation.mutate()}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
