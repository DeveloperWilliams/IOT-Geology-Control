// app/_layout.jsx
import { Stack } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useFonts, JosefinSans_400Regular, JosefinSans_600SemiBold, JosefinSans_500Medium } from '@expo-google-fonts/josefin-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [fontsLoaded] = useFonts({
    JosefinSans_400Regular,
    JosefinSans_600SemiBold,
    JosefinSans_500Medium
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  }
});
