import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import styles from "../components/style";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Animatable from "react-native-animatable";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import BluetoothManager, { BluetoothDevice } from "react-native-bluetooth-classic";

// SVG and animation imports
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Dimensions
import { Dimensions } from "react-native";
const { width: screenWidth } = Dimensions.get("window");

// Audio files
const beepSound = require("../assets/beep.mp3");
const audioFiles = {
  813: require("../assets/813hz.wav"),
  559: require("../assets/559hz.wav"),
  407: require("../assets/407hz.wav"),
  254: require("../assets/254hz.wav"),
  203: require("../assets/203hz.wav"),
  153: require("../assets/153hz.wav"),
  102: require("../assets/102hz.wav"),
  33: require("../assets/33hz.wav"),
};

const primaryColor = "#6C63FF";
const frequencyList = [813, 559, 407, 254, 203, 153, 102, 33];
const DEVICE_ADDRESS = "3C:8A:1F:9C:45:D4"; // Bluetooth device MAC address

interface StationMeasurement {
  frequency: number;
  txCurrent: string;
  rxVoltage: string;
  latitude: string;
  longitude: string;
  distance: number;
  calculatedDepth: number;
  calculatedConductivity: number;
  calculatedResistivity: number;
  date: string;
  time: string;
}

interface ResultData {
  name: string;
  common: {
    transcat: string;
    interstation: string;
    averageResistivity: string;
    intercoil: string;
  };
  stations: { [key: number]: StationMeasurement[] };
  gps?: { latitude: number; longitude: number };
}

export default function DataEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = params.isEditing === "true";
  const projectIndex = params.projectIndex
    ? parseInt(params.projectIndex as string, 10)
    : null;

  // State management
  const [step, setStep] = useState(0);
  const [resultName, setResultName] = useState("");
  const [commonParams, setCommonParams] = useState({
    transcat: "",
    interstation: "",
    averageResistivity: "",
    intercoil: "",
  });
  const [currentStation, setCurrentStation] = useState(0);
  const [currentFrequencyIndex, setCurrentFrequencyIndex] = useState(0);
  const [stationMeasurements, setStationMeasurements] = useState<{
    [freq: number]: StationMeasurement;
  }>({});
  const [resultData, setResultData] = useState<ResultData>({
    name: "",
    common: {
      transcat: "",
      interstation: "",
      averageResistivity: "",
      intercoil: "",
    },
    stations: {},
  });
  const [sensorStatus, setSensorStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [gps, setGps] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const phase = useSharedValue(0);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [usePhoneSignal, setUsePhoneSignal] = useState(false);

  // Bluetooth state
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);

  // Waveform constants
  const WAVEFORM_HEIGHT = 120;
  const AMPLITUDE = 50;
  const WAVELENGTH_FACTOR = 150;

  // Animation properties
  const animatedProps = useAnimatedProps(() => {
    const path: string[] = [];
    const frequency = frequencyList[currentFrequencyIndex];
    const wavelength = screenWidth / (frequency / WAVELENGTH_FACTOR);
    const shouldAnimate = isAcquiring && usePhoneSignal;

    for (let x = 0; x <= screenWidth; x += 2) {
      const y = shouldAnimate
        ? WAVEFORM_HEIGHT / 2 + 
          AMPLITUDE *
            Math.sin((x / wavelength) * 2 * Math.PI + phase.value) *
            Math.sin(phase.value / 2)
        : WAVEFORM_HEIGHT / 2;

      path.push(`${x} ${y}`);
    }

    return {
      d: `M ${path.join(" L ")}`,
    };
  });

  // Animation effect
  useEffect(() => {
    if (isAcquiring && usePhoneSignal) {
      phase.value = withRepeat(
        withTiming(2 * Math.PI, {
          duration: 1000 / (frequencyList[currentFrequencyIndex] / 300),
          easing: Easing.linear,
        }),
        -1
      );
    } else {
      phase.value = 0;
    }
  }, [currentFrequencyIndex, isAcquiring, usePhoneSignal]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      const unloadAudio = async () => {
        if (currentSound) {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
        }
      };
      unloadAudio();
      
      // Disconnect Bluetooth on unmount
      const disconnectBluetooth = async () => {
        if (bluetoothDevice && isBluetoothConnected) {
          try {
            await bluetoothDevice.disconnect();
            console.log("Bluetooth disconnected");
          } catch (error) {
            console.error("Bluetooth disconnect error:", error);
          }
        }
      };
      disconnectBluetooth();
    };
  }, [currentSound, bluetoothDevice, isBluetoothConnected]);

  // Initialize GPS
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setGps(location.coords);
      }
    })();
  }, []);

  // Initialize Bluetooth
  useEffect(() => {
    const initBluetooth = async () => {
      try {
        // Check and request Bluetooth permissions (Android 12+ requires runtime permission)
        let granted = true;
        if (Platform.OS === "android" && Platform.Version >= 31) {
          // @ts-ignore
          const { PermissionsAndroid } = require("react-native");
          const btScan = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
              title: "Bluetooth Permission",
              message: "App needs access to scan for Bluetooth devices.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK",
            }
          );
          const btConnect = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
              title: "Bluetooth Permission",
              message: "App needs access to connect to Bluetooth devices.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK",
            }
          );
          granted =
            btScan === PermissionsAndroid.RESULTS.GRANTED &&
            btConnect === PermissionsAndroid.RESULTS.GRANTED;
        }
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Bluetooth permission is required to connect to the device"
          );
          return;
        }

        // Enable Bluetooth if not enabled
        const enabled = await BluetoothManager.isBluetoothEnabled();
        if (!enabled) {
          Alert.alert(
            "Bluetooth Disabled",
            "Please enable Bluetooth manually in your device settings."
          );
          return;
        }
      } catch (error) {
        console.error("Bluetooth init error:", error);
        Alert.alert("Bluetooth Error", "Failed to initialize Bluetooth");
      }
    };

    if (step === 1) {
      initBluetooth();
    }
  }, [step]);

  // Load existing data for editing
  useEffect(() => {
    const loadExistingData = async () => {
      if (isEditing && params.existingData) {
        const existingData: ResultData = JSON.parse(
          params.existingData as string
        );
        setResultName(existingData.name);
        setCommonParams(existingData.common);
        setResultData(existingData);
        setCurrentStation(parseInt(params.currentStation as string, 10));
        setStep(1);
      }
    };
    loadExistingData();
  }, [isEditing, params.existingData, params.currentStation]);

  // Reset acquisition when frequency changes
  useEffect(() => {
    setIsAcquiring(false);
  }, [currentFrequencyIndex]);

  // Measurement calculations
  const calculateMeasurements = (
    freq: number,
    txCurrent: string,
    rxVoltage: string
  ) => {
    const intercoilValue = parseFloat(commonParams.intercoil);
    const avgRes = parseFloat(commonParams.averageResistivity);
    const rxVoltage_mV = parseFloat(rxVoltage);
    const txCurrent_A = parseFloat(txCurrent);

    const rxVoltage_V = rxVoltage_mV / 1000;
    const ht = (100 * rxVoltage_V) / (4 * intercoilValue);
    const term1 = 2 * ht;
    const term2 = (0.00000232 * intercoilValue) / Math.pow(intercoilValue, 3);
    const numerator = term1 - term2;
    const conductivity =
      ((numerator / 0.0000039478) * freq * Math.pow(intercoilValue, 2)) /
      100000000;
    const resistivity = (1 / conductivity) * 10000;
    const depth = -(503 / 5) * Math.sqrt(avgRes / freq);

    return {
      conductivity,
      resistivity,
      depth,
      txCurrent: txCurrent_A.toFixed(2),
      rxVoltage: rxVoltage_mV.toFixed(2),
    };
  };

  // Connect to Bluetooth device
  const connectToDevice = useCallback(async () => {
    if (isBluetoothConnected || isConnecting) return;

    setIsConnecting(true);
    setSensorStatus("loading");

    try {
      // Discover paired devices
      const paired = await BluetoothManager.getBondedDevices();
      const device = paired.find((d: BluetoothDevice) => d.address === DEVICE_ADDRESS);
      if (!device) {
        throw new Error("Device not found. Please pair the device first.");
      }
      await device.connect();
      setBluetoothDevice(device);
      setIsBluetoothConnected(true);
      setSensorStatus("success");
      console.log("Bluetooth connected successfully");
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      setSensorStatus("error");
      Alert.alert(
        "Connection Failed",
        "Could not connect to the measurement device"
      );
    } finally {
      setIsConnecting(false);
    }
  }, [isBluetoothConnected, isConnecting]);

  // Fetch data from Bluetooth device
  const handleFetchData = useCallback(async () => {
    // Connect if not already connected
    if (!isBluetoothConnected) {
      await connectToDevice();
      return;
    }

    setIsAcquiring(true);
    setSensorStatus("loading");

    try {
      // Stop and unload current sound if exists
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      }

      // Play audio tone if using phone signal generator
      if (usePhoneSignal) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          audioFiles[
            frequencyList[currentFrequencyIndex] as keyof typeof audioFiles
          ]
        );
        setCurrentSound(sound);
        await sound.playAsync();
      }

      // Send frequency command via Bluetooth
      if (!bluetoothDevice) throw new Error("No Bluetooth device connected");
      
      // Send frequency command
      const command = `${frequencyList[currentFrequencyIndex]}\n`;
      await bluetoothDevice.write(command);
      console.log("Sent command:", command);

      // Read response (may need to implement timeout manually)
      const response = await bluetoothDevice.read();
      console.log("Received response:", response);
      
      // Parse JSON response
      const data = JSON.parse(response.trim());

      // Perform calculations
      const calculations = calculateMeasurements(
        frequencyList[currentFrequencyIndex],
        data.current.toFixed(2),
        (data.voltage * 1000).toFixed(2)
      );

      // Update station measurements
      setStationMeasurements((prev) => ({
        ...prev,
        [frequencyList[currentFrequencyIndex]]: {
          frequency: frequencyList[currentFrequencyIndex],
          txCurrent: calculations.txCurrent,
          rxVoltage: calculations.rxVoltage,
          latitude: gps?.latitude?.toFixed(6) || "0.000000",
          longitude: gps?.longitude?.toFixed(6) || "0.000000",
          distance:
            (currentStation - (parseInt(commonParams.transcat, 10) * 100 + 1)) *
            parseFloat(commonParams.interstation),
          calculatedDepth: calculations.depth,
          calculatedConductivity: calculations.conductivity,
          calculatedResistivity: calculations.resistivity,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
        },
      }));

      // Play confirmation beep
      const { sound: confirmationBeep } = await Audio.Sound.createAsync(
        beepSound
      );
      await confirmationBeep.playAsync();

      setSensorStatus("success");
      console.log("Data acquisition successful");
    } catch (error) {
      console.error("Data acquisition error:", error);
      setSensorStatus("error");
      setIsBluetoothConnected(false);
      setBluetoothDevice(null);
      
      Alert.alert(
        "Acquisition Failed",
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message || "Failed to get measurement data"
          : "Failed to get measurement data"
      );
    } finally {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      }
      setIsAcquiring(false);
    }
  }, [
    isBluetoothConnected,
    bluetoothDevice,
    currentFrequencyIndex,
    usePhoneSignal,
    currentSound,
    connectToDevice,
    gps,
    currentStation,
    commonParams,
  ]);

  // Save station data
  const handleSaveStation = async () => {
    const stationData = Object.values(stationMeasurements);
    if (stationData.length !== frequencyList.length) {
      Alert.alert("Incomplete Data", "Complete all frequencies before saving");
      return;
    }

    const updatedData = {
      ...resultData,
      name: resultName,
      common: commonParams,
      stations: { ...resultData.stations, [currentStation]: stationData },
    };

    try {
      const storedResults = await AsyncStorage.getItem("results");
      const results = storedResults ? JSON.parse(storedResults) : [];

      if (isEditing && typeof projectIndex === "number") {
        results[projectIndex] = updatedData;
      } else {
        results.push(updatedData);
      }

      await AsyncStorage.setItem("results", JSON.stringify(results));
      setCurrentStation((prev) => prev + 1);
      setCurrentFrequencyIndex(0);
      setStationMeasurements({});
      Alert.alert("Success", `Station ${currentStation} saved successfully`);
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save station data");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 0 ? "Project Setup" : `Station ${currentStation}`}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {step === 0 ? (
        <Animatable.View animation="fadeIn" style={styles.card}>
          <Text style={styles.cardTitle}>Configure Project</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Name</Text>
            <TextInput
              style={styles.input}
              value={resultName}
              onChangeText={setResultName}
              placeholder="Enter project name"
            />
          </View>

          <View style={styles.paramGrid}>
            <View style={styles.paramItem}>
              <Text style={styles.label}>Transect Number</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={commonParams.transcat}
                onChangeText={(t) =>
                  setCommonParams((p) => ({ ...p, transcat: t }))
                }
              />
            </View>

            <View style={styles.paramItem}>
              <Text style={styles.label}>Interstation (m)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={commonParams.interstation}
                onChangeText={(t) =>
                  setCommonParams((p) => ({ ...p, interstation: t }))
                }
              />
            </View>

            <View style={styles.paramItem}>
              <Text style={styles.label}>Resistivity (Ω·m)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={commonParams.averageResistivity}
                onChangeText={(t) =>
                  setCommonParams((p) => ({ ...p, averageResistivity: t }))
                }
              />
            </View>

            <View style={styles.paramItem}>
              <Text style={styles.label}>Intercoil (m)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={commonParams.intercoil}
                onChangeText={(t) =>
                  setCommonParams((p) => ({ ...p, intercoil: t }))
                }
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              const isValid =
                Object.values(commonParams).every((v) => !!v) && !!resultName;
              if (isValid) {
                const startStation =
                  parseInt(commonParams.transcat, 10) * 100 + 1;
                setCurrentStation(startStation);
                setStep(1);
              } else {
                Alert.alert("Missing Fields", "Fill all required parameters");
              }
            }}
          >
            <Text style={styles.buttonText}>Initialize Project</Text>
          </TouchableOpacity>
        </Animatable.View>
      ) : (
        <Animatable.View animation="fadeIn" style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.frequencyLabel}>
              {frequencyList[currentFrequencyIndex]} Hz
            </Text>
            <Text style={styles.progressText}>
              {currentFrequencyIndex + 1}/{frequencyList.length}
            </Text>
          </View>

          <View style={styles.sensorContainer}>
            <TouchableOpacity
              style={[
                styles.sensorButton,
                sensorStatus === "loading" && styles.sensorLoading,
                sensorStatus === "error" && styles.sensorError,
              ]}
              onPress={handleFetchData}
              disabled={sensorStatus === "loading" || isConnecting}
            >
              {sensorStatus === "loading" || isConnecting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={
                      isBluetoothConnected 
                        ? "bluetooth" 
                        : "bluetooth-outline"
                    }
                    size={32}
                    color="#FFF"
                  />
                  <Text style={styles.sensorButtonText}>
                    {isBluetoothConnected
                      ? "Acquire Data"
                      : "Connect Device"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dataDisplay}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Tx Current (A)</Text>
                <Text style={styles.dataValue}>
                  {stationMeasurements[frequencyList[currentFrequencyIndex]]
                    ?.txCurrent || "--"}
                </Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Rx Voltage (mV)</Text>
                <Text style={styles.dataValue}>
                  {stationMeasurements[frequencyList[currentFrequencyIndex]]
                    ?.rxVoltage || "--"}
                </Text>
              </View>
            </View>
          </View>

          {/* Bluetooth status indicator */}
          <View style={localStyles.bluetoothStatus}>
            <Text style={[
              localStyles.statusText,
              isBluetoothConnected ? localStyles.connected : localStyles.disconnected
            ]}>
              {isBluetoothConnected 
                ? "Device Connected" 
                : "Device Disconnected"}
            </Text>
          </View>

          <View style={styles.visualizationContainer}>
            <Svg width="100%" height={WAVEFORM_HEIGHT}>
              <AnimatedPath
                animatedProps={animatedProps}
                stroke={primaryColor}
                strokeWidth="2"
                fill="transparent"
              />
            </Svg>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Use Phone Signal Generator</Text>
            <Switch
              value={usePhoneSignal}
              onValueChange={(value) => setUsePhoneSignal(value)}
              trackColor={{ false: "#767577", true: primaryColor }}
              thumbColor={usePhoneSignal ? "#f5dd4b" : "#f4f3f4"}
              disabled={isAcquiring}
            />
          </View>

          <View style={styles.navigationControls}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentFrequencyIndex === 0 && styles.disabledButton,
              ]}
              onPress={() => setCurrentFrequencyIndex((prev) => prev - 1)}
              disabled={currentFrequencyIndex === 0}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>

            {currentFrequencyIndex === frequencyList.length - 1 ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSaveStation}
                disabled={
                  !stationMeasurements[frequencyList[currentFrequencyIndex]]
                }
              >
                <Text style={styles.buttonText}>Complete Station</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.navButton,
                  !stationMeasurements[frequencyList[currentFrequencyIndex]] &&
                    styles.disabledButton,
                ]}
                onPress={() => setCurrentFrequencyIndex((prev) => prev + 1)}
                disabled={
                  !stationMeasurements[frequencyList[currentFrequencyIndex]]
                }
              >
                <Text style={styles.navButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animatable.View>
      )}
    </ScrollView>
  );
}

const WAVEFORM_HEIGHT = 160;


// Local styles for this component
const localStyles = StyleSheet.create({
  bluetoothStatus: {
    marginVertical: 10,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#F44336',
  },
});