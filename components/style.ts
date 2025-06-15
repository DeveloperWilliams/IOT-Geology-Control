import { StyleSheet } from "react-native";

const primaryColor = "#6C63FF";
 const WAVEFORM_HEIGHT = 120;

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F9F9FB",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "JosefinSans_600SemiBold",
    color: primaryColor,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "JosefinSans_600SemiBold",
    color: "#2D3436",
    textAlign: "center",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: "JosefinSans_500Medium",
    fontSize: 14,
    color: "#6C63FF",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "JosefinSans_400Regular",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  paramGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  paramItem: {
    width: "48%",
  },
  primaryButton: {
    backgroundColor: primaryColor,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  frequencyLabel: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 24,
    color: "#2D3436",
  },
  progressText: {
    fontFamily: "JosefinSans_500Medium",
    fontSize: 16,
    color: primaryColor,
  },
  sensorContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  sensorButton: {
    backgroundColor: primaryColor,
    borderRadius: 100,
    padding: 24,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  sensorLoading: {
    backgroundColor: "#4A90E2",
  },
  sensorError: {
    backgroundColor: "#FF6B6B",
  },
  sensorButtonText: {
    color: "#FFF",
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 16,
  },
  dataDisplay: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  dataItem: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  dataLabel: {
    fontFamily: "JosefinSans_500Medium",
    fontSize: 14,
    color: "#6C63FF",
    marginBottom: 8,
  },
  dataValue: {
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 18,
    color: "#2D3436",
  },
  navigationControls: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: "#E9ECEF",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  navButtonText: {
    color: primaryColor,
    fontFamily: "JosefinSans_600SemiBold",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  visualizationContainer: {
    height: WAVEFORM_HEIGHT,
    marginVertical: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center", // Add this to ensure vertical centering
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginVertical: 16,
  },
  toggleLabel: {
    fontFamily: "JosefinSans_500Medium",
    fontSize: 16,
    color: "#2D3436",
  },
});
