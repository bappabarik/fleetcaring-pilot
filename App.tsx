// @ts-expect-error — CSS side-effect import, handled by Metro's own
// bundler transform at build time; not something tsc needs to type.
import "./global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { RootNavigator } from "@/navigation/RootNavigator";
import { useSyncEngine } from "@/offline/syncEngine";

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
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <SyncEngineMount />
      <RootNavigator />
    </QueryClientProvider>
  );
}