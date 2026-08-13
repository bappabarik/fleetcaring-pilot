// @ts-expect-error — CSS side-effect import, handled by Metro's own
// bundler transform at build time; not something tsc needs to type.
import "./global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useSyncEngine } from "@/offline/syncEngine";
// Side-effect import — registers the background location task via
// TaskManager.defineTask. Must happen at module scope on every launch
// (including OS-triggered background launches) so the task definition
// exists before the OS tries to invoke it; it can't be deferred into a
// component's render.
import "@/realtime/locationTask";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

function SyncEngineMount() {
  useSyncEngine();
  return null;
}

export default function App() {
  return (
    // Required root wrapper for react-native-gesture-handler — without
    // it, gestures (SwipeToConfirm) silently fail to register on Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <SyncEngineMount />
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}