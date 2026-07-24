import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Calendar, HelpCircle } from "lucide-react-native";
import { HomeStackNavigator } from "./HomeStackNavigator";
import ScheduleScreen from "@/screens/schedule/ScheduleScreen";
import SupportScreen from "@/screens/support/SupportScreen";

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3652D9",
        tabBarInactiveTintColor: "#8891A5",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{ tabBarIcon: ({ color, size }) => <HelpCircle color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}