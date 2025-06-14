import "react-native-get-random-values";
import { Buffer } from "buffer";
import * as MediaLibrary from "expo-media-library";
import React, { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";

// Import ExcelJS, Expo FileSystem and Expo Sharing for the export functionality.
import ExcelJS from "exceljs";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const primaryColor = "#6C63FF";

interface CommonParams {
  transcat: string;
  interstation: string;
  averageResistivity: string;
  intercoil: string;
}

interface StationMeasurement {
  frequency: number;
  latitude: string;
  longitude: string;
  distance: number;
  txCurrent: string;
  rxVoltage: string;
  calculatedDepth: number;
  calculatedConductivity: number;
  calculatedResistivity: number;
  date: string;
  time: string;
}

interface ResultData {
  name: string;
  common: CommonParams;
  stations: { [key: string]: StationMeasurement[] };
  gps?: { latitude: number; longitude: number };
}

export default function DetailDataScreen() {
  const { index } = useLocalSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);

  const loadResult = async () => {
    try {
      const storedResults = await AsyncStorage.getItem("results");
      if (storedResults) {
        const resultsArray: ResultData[] = JSON.parse(storedResults);
        const selected = resultsArray[Number(index)];
        setResult(selected);
      }
    } catch (error) {
      console.error("Error loading result details:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadResult();
    }, [index])
  );


  const params = useLocalSearchParams();

  // Next Station
  // In DetailDataScreen.tsx
const handleNextStation = () => {
  if (!result) return;

  // Get current stations and determine next station number
  const stationNumbers = Object.keys(result.stations)
    .map(Number)
    .filter(n => !isNaN(n));
  
  if (stationNumbers.length === 0) return;

  const lastStation = Math.max(...stationNumbers);
  const nextStation = lastStation + 1;

  router.push({
    pathname: "/data-entry",
    params: {
      isEditing: "true",
      projectIndex: Array.isArray(index) ? index[0] : index || "",
      existingData: JSON.stringify(result),
      currentStation: nextStation.toString(),
    },
  });
};

const handleNewTransect = () => {
  if (!result) return;

  // Create new transect while preserving project name
  const currentTransect = parseInt(result.common.transcat, 10);
  const newTransect = currentTransect + 1;
  const startingStation = newTransect * 100 + 1;

  router.push({
    pathname: "/data-entry",
    params: {
      isEditing: "true",
      projectIndex: Array.isArray(index) ? index[0] : index || "",
      existingData: JSON.stringify({
        ...result,
        common: {
          ...result.common,
          transcat: newTransect.toString()
        }
      }),
      currentStation: startingStation.toString(),
    },
  });
};
  const handleBack = () => {
    // Optionally check if the router can go back
    // If not, push to a default screen (like the index/home screen)
    if (router.back) {
      router.back();
    } else {
      router.push("/"); // Adjust this route as needed.
    }
  };

  const exportToExcel = async () => {
    if (!result) {
      Alert.alert("No data", "There is no result data to export.");
      return;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Permission to access media library is required to save the file."
      );
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Lambda EM";
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet("Measurements");

      // Title Row
      worksheet.mergeCells("A1:L1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `${result.name.toUpperCase()} ELECTROMAGNETIC SURVEY DATA`;
      titleCell.font = {
        name: "Times New Roman",
        bold: true,
        size: 18,
        color: { argb: "FFFFFFFF" },
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6C63FF" },
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.border = {
        top: { style: "medium", color: { argb: "FF000000" } },
        bottom: { style: "medium", color: { argb: "FF000000" } },
      };

      // Common Parameters Section
      const commonParams = [
        { label: "Interstation", value: `${result.common.interstation} m` },
        {
          label: "Average Resistivity",
          value: `${result.common.averageResistivity} Ω·m`,
        },
        { label: "Intercoil", value: `${result.common.intercoil} m` },
      ];

      commonParams.forEach((param, index) => {
        const startCol = index * 4 + 1;
        worksheet.mergeCells(2, startCol, 2, startCol + 3);

        const cell = worksheet.getCell(2, startCol);
        cell.value = `${param.label}: ${param.value}`;
        cell.font = {
          name: "Times New Roman",
          bold: true,
          italic: true,
          size: 12,
          color: { argb: "FF2D3436" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE6E6FA" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF6C63FF" } },
          bottom: { style: "thin", color: { argb: "FF6C63FF" } },
          left: { style: "thin", color: { argb: "FF6C63FF" } },
          right: { style: "thin", color: { argb: "FF6C63FF" } },
        };
      });

      // Header Row
      const headers = [
        "Station",
        "Freq (Hz)",
        "Latitude",
        "Longitude",
        "Distance (m)",
        "Depth (m)",
        "Tx (A)",
        "Rx (mV)",
        "Cond (µS/cm)",
        "Resist (Ω·m)",
        "Date",
        "Time",
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = {
          name: "Times New Roman",
          bold: true,
          size: 12,
          color: { argb: "FFFFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4B4D7E" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF6C63FF" } },
          bottom: { style: "thin", color: { argb: "FF6C63FF" } },
          left: { style: "thin", color: { argb: "FF6C63FF" } },
          right: { style: "thin", color: { argb: "FF6C63FF" } },
        };
      });
      headerRow.height = 25;

      // Data Rows
      Object.keys(result.stations).forEach((stationKey) => {
        result.stations[stationKey].forEach((m) => {
          const row = worksheet.addRow([
            stationKey,
            m.frequency,
            parseFloat(m.latitude).toFixed(6),
            parseFloat(m.longitude).toFixed(6),
            m.distance.toFixed(2),
            m.calculatedDepth.toFixed(2),
            parseFloat(m.txCurrent).toFixed(3),
            parseFloat(m.rxVoltage).toFixed(3),
            m.calculatedConductivity.toFixed(2),
            m.calculatedResistivity.toFixed(2),
            m.date,
            m.time,
          ]);

          row.eachCell((cell) => {
            cell.font = {
              name: "Times New Roman",
              size: 11,
              color: { argb: "FF444444" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
              bottom: { style: "hair", color: { argb: "FFEEEEEE" } },
              left: { style: "hair", color: { argb: "FFEEEEEE" } },
              right: { style: "hair", color: { argb: "FFEEEEEE" } },
            };
          });
        });
      });

      // Column Formatting
      worksheet.columns.forEach((column, index) => {
        column.width = index === 0 ? 12 : 14;
        if ([1, 4, 5, 8, 9].includes(index)) {
          column.numFmt = "0.00";
        }
      });

      // Alternating Row Colors
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 3) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: rowNumber % 2 === 0 ? "FFF8F8F8" : "FFFFFFFF" },
            };
          });
        }
      });

      // Generate File
      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const fileName = `${result.name.replace(/\s+/g, "_")}_survey_data.xlsx`;
      const uri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert("Success", "Excel file generated successfully!");

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(
          "Sharing Unavailable",
          "File saved to app directory: " + uri
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert(
        "Export Failed",
        "An error occurred while generating the file. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Result not found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtnContainer}
        >
          <Ionicons name="arrow-back" size={24} color={primaryColor} />
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMeasurementTableHeader = () => (
    <View style={[styles.tableRow, styles.tableHeader]}>
      <Text style={[styles.tableCell, styles.headerText]}>Freq (Hz)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Lat</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Long</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Distance (m)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Depth (m)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Tx (A)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Rx (mV)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Cond (µS/cm)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Resist (Ω·m)</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Date</Text>
      <Text style={[styles.tableCell, styles.headerText]}>Time</Text>
    </View>
  );

  const renderMeasurementRow = (m: StationMeasurement, idx: number) => (
    <View key={idx} style={styles.tableRow}>
      <Text style={styles.tableCell}>{m.frequency}</Text>
      <Text style={styles.tableCell}>{parseFloat(m.latitude).toFixed(6)}</Text>
      <Text style={styles.tableCell}>{parseFloat(m.longitude).toFixed(6)}</Text>
      <Text style={styles.tableCell}>{m.distance}</Text>
      <Text style={styles.tableCell}>{m.calculatedDepth.toFixed(3)}</Text>
      <Text style={styles.tableCell}>{m.txCurrent}</Text>
      <Text style={styles.tableCell}>{m.rxVoltage}</Text>
      <Text style={styles.tableCell}>
        {m.calculatedConductivity.toFixed(3)}
      </Text>
      <Text style={styles.tableCell}>{m.calculatedResistivity.toFixed(3)}</Text>
      <Text style={styles.tableCell}>{m.date}</Text>
      <Text style={styles.tableCell}>{m.time}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.navbar}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
        />
        <Text style={styles.navTitle}>Lambda EM</Text>
      </View>

      <TouchableOpacity
        style={styles.backBtnContainer}
        onPress={() => handleBack()}
      >
        <Ionicons name="arrow-back" size={24} color={primaryColor} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{result.name}</Text>

      <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
        <Text style={styles.exportText}>Export as Excel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => setShowActionModal(true)}
      >
        <Text style={styles.exportText}>Continue with Data Entry</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Parameters</Text>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Transcect:</Text>
          <Text style={styles.paramValue}>{result.common.transcat}</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Interstation (m):</Text>
          <Text style={styles.paramValue}>{result.common.interstation}</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Avg Resistivity (Ω·m):</Text>
          <Text style={styles.paramValue}>
            {result.common.averageResistivity}
          </Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={styles.paramLabel}>Intercoil (m):</Text>
          <Text style={styles.paramValue}>{result.common.intercoil}</Text>
        </View>
        {result.gps && (
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>GPS:</Text>
            <Text style={styles.paramValue}>
              {result.gps.latitude.toFixed(6)},{" "}
              {result.gps.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stations & Measurements</Text>
        {Object.keys(result.stations).map((stationKey) => (
          <View key={stationKey} style={styles.stationContainer}>
            <Text style={styles.stationTitle}>Station {stationKey}</Text>
            <ScrollView horizontal>
              <View style={styles.table}>
                {renderMeasurementTableHeader()}
                {result.stations[stationKey].map((measurement, idx) =>
                  renderMeasurementRow(measurement, idx)
                )}
              </View>
            </ScrollView>
          </View>
        ))}
      </View>
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Continue Data Entry</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowActionModal(false);
                handleNextStation();
              }}
            >
              <Text style={styles.modalOptionText}>Next Station</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowActionModal(false);
                handleNewTransect();
              }}
            >
              <Text style={styles.modalOptionText}>New Transect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logo: { width: 40, height: 40, resizeMode: "contain" },
  navTitle: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 20,
    color: primaryColor,
  },
  backBtnContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: primaryColor,
    fontFamily: "JosefinSans_600SemiBold",
  },
  title: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 26,
    textAlign: "center",
    marginBottom: 20,
    color: "#2d3436",
  },
  exportButton: {
    backgroundColor: primaryColor,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: "center",
  },
  exportText: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 20,
    marginBottom: 10,
    color: "#2d3436",
  },
  paramRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  paramLabel: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 16,
    color: "#444",
    marginRight: 10,
    width: 150,
  },
  paramValue: {
    fontFamily: "JosefinSans_400Regular",
    fontSize: 16,
    color: "#555",
  },
  stationContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  stationTitle: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 18,
    marginBottom: 10,
    color: primaryColor,
  },
  table: {
    minWidth: 800,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableHeader: { backgroundColor: "#f2f2f2" },
  tableCell: {
    flex: 1,
    fontFamily: "JosefinSans_400Regular",
    fontSize: 10,
    color: "#333",
    paddingHorizontal: 5,
    textAlign: "center",
  },
  headerText: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 10,
    color: primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#cc0000",
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: primaryColor,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "JosefinSans_600SemiBold",
    marginBottom: 15,
    textAlign: "center",
    color: "#2d3436",
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: "JosefinSans_600SemiBold",
    color: primaryColor,
    textAlign: "center",
  },
  modalCancel: {
    padding: 15,
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: "JosefinSans_600SemiBold",
    color: "#666",
    textAlign: "center",
  },
});

export { DetailDataScreen };
