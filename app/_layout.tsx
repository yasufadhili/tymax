
import {
  DarkTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";

import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

 export const unstable_settings = {
   // Ensure that reloading on `/modal` keeps a back button present.
   initialRouteName: "index",
 };

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Bold': require("@/assets/fonts/SpaceGrotesk-Bold.ttf"),
    'SemiBold': require("@/assets/fonts/SpaceGrotesk-SemiBold.ttf"),
    'Medium': require("@/assets/fonts/SpaceGrotesk-Medium.ttf"),
    'Regular': require("@/assets/fonts/SpaceGrotesk-Regular.ttf"),
    'Light': require("@/assets/fonts/SpaceGrotesk-Light.ttf"),
  });

  const [styleLoaded, setStyleLoaded] = useState(false);
  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // useLayoutEffect(() => {
  //   setStyleLoaded(true);
  // }, [styleLoaded]);

  // if (!loaded || !styleLoaded) {
  //   return null;
  // }

  return <RootLayoutNav />;
}

function RootLayoutNav() {

  return (
    <GestureHandlerRootView className="flex-1">
      <GluestackUIProvider mode="dark">
        <ThemeProvider value={DarkTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="home" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="category" options={{ headerShown: false }} />
            <Stack.Screen name="channel" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack>
          <StatusBar backgroundColor={"#000"} />
        </ThemeProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
