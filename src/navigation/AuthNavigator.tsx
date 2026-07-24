import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "@/screens/auth/SignInScreen";
import OtpVerifyScreen from "@/screens/auth/OtpVerifyScreen";

export type AuthStackParamList = {
  SignIn: undefined;
  OtpVerify: { phoneNumber: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </Stack.Navigator>
  );
}
