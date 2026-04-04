import { useEffect } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold
} from "@expo-google-fonts/space-grotesk";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoadingScreen } from "@/components/loading-screen";
import { NotificationStack } from "@/components/notification-stack";
import { useAppStore } from "@/store/app-store";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function AppNavigator() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade"
        }}
      />
      <NotificationStack />
    </>
  );
}

export default function RootLayout() {
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const [fontsLoaded] = useFonts({
    DMSans: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    SpaceGrotesk: SpaceGrotesk_500Medium,
    SpaceGroteskBold: SpaceGrotesk_700Bold
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!fontsLoaded || !hydrated) {
    return <LoadingScreen />;
  }

  const content = <AppNavigator />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {convexClient ? <ConvexProvider client={convexClient}>{content}</ConvexProvider> : content}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
