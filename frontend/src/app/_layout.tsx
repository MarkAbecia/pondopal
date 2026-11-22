import "../global.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { registerTransactionMutations } from "@/features/transactions/api";
import i18n, { deviceLanguage } from "@/i18n";
import { persister, queryClient } from "@/lib/query";
import { palette, themeVars, useScheme } from "@/lib/theme";
import { useSession } from "@/stores/session";
import { useSettings } from "@/stores/settings";

void SplashScreen.preventAutoHideAsync();
// Before restore, so paused offline mutations can find their mutationFn and resume.
registerTransactionMutations(queryClient);

function navTheme(scheme: "light" | "dark") {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const c = palette[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.brandInk,
      background: c.canvas,
      card: c.card,
      text: c.fg,
      border: c.lineSoft,
    },
  };
}

export default function RootLayout() {
  const session = useSession((s) => s.session);
  const ready = useSession((s) => s.ready);
  const language = useSettings((s) => s.language);
  const scheme = useScheme();

  useEffect(() => {
    void i18n.changeLanguage(
      language === "system" ? deviceLanguage() : language,
    );
  }, [language]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: "v1" }}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      <View style={[{ flex: 1 }, themeVars[scheme]]}>
        <StatusBar style="auto" />
        <ThemeProvider value={navTheme(scheme)}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="space/[id]" />
              <Stack.Screen
                name="transaction/[id]"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen name="challenge" />
              <Stack.Screen name="goal" />
            <Stack.Screen name="paluwagan" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Screen name="auth/callback" />
          </Stack>
        </ThemeProvider>
      </View>
    </PersistQueryClientProvider>
  );
}
