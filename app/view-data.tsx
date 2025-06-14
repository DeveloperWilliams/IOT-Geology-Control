// app/view-data.jsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";

const primaryColor = "#6C63FF";

interface Result {
  name: string;
  stations: Record<string, any>; // Adjust 'any' as needed for specific station data
  common: {
    averageResistivity: string; // Changed to string to match saved data
    [key: string]: any; // Allow other common params
  };
}

export default function ViewDataScreen() {
  const router = useRouter();
  const [pastResults, setPastResults] = useState<Result[]>([]);

  const loadPastResults = async () => {
    try {
      const storedResults = await AsyncStorage.getItem("results");
      setPastResults(storedResults ? JSON.parse(storedResults) : []);
    } catch (error) {
      console.error("Error loading results:", error);
    }
  };

  // Using useFocusEffect to reload data each time the screen is focused.
  useFocusEffect(
    useCallback(() => {
      loadPastResults();
    }, [])
  );

  const renderResult = ({
    item,
    index,
  }: {
    item: Result;
    index: number;
  }) => (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>{item.name}</Text>
      <View style={styles.resultMeta}>
        <Text style={styles.metaText}>
          Stations: {Object.keys(item.stations).length}
        </Text>
        <Text style={styles.metaText}>
          Resistivity: {item.common.averageResistivity} Ωm
        </Text>
      </View>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() =>
          router.push({
            pathname: "/detail-data",
            params: { index: index.toString() },
          })
        }
      >
        <Text style={styles.detailsButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={primaryColor} />
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Saved Projects</Text>
      <FlatList
        data={pastResults}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={renderResult}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No saved projects found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  backButton: { padding: 10, alignSelf: "flex-start" },
  sectionTitle: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 26,
    color: "#2d3436",
    marginVertical: 20,
    textAlign: "center",
  },
  resultCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultTitle: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 20,
    color: "#2d3436",
  },
  resultMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 15,
  },
  metaText: {
    fontFamily: "JosefinSans_400Regular",
    fontSize: 14,
    color: "#666",
  },
  detailsButton: {
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 15,
    alignItems: "center",
  },
  detailsButtonText: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 14,
    color: primaryColor,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontFamily: "JosefinSans_400Regular",
    fontSize: 16,
    color: "#999",
    marginTop: 15,
  },
});
