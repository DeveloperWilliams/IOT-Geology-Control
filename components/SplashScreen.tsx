import { View, Image, StyleSheet, Animated, Easing } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial opacity: 0
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // Initial scale: 0.8

  useEffect(() => {
    async function prepare() {
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, // Fully visible
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, // Scale to normal size
          duration: 1000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]).start();

     
      await SplashScreen.hideAsync();
      onFinish();
    }
    prepare();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/images/icon.png")}
        style={[styles.image, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  image: {
    width: 150,
    height: 150,
    resizeMode: "contain",
  },
});
