// app/index.jsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const primaryColor = '#6C63FF';
const secondaryColor = '#4A44B2';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  return (
    <View style={styles.containerCentered}>
      <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.homeTitle}>GeoData Collector</Text>
      
      <Link href="/data-entry" asChild>
        <TouchableOpacity style={styles.menuCard}>
          <LinearGradient colors={[primaryColor, secondaryColor]} style={styles.gradientMenu}>
            <Ionicons name="add-circle" size={32} color="white" />
            <Text style={styles.menuCardText}>New Project</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Link>
      
      <Link href="/view-data" asChild>
        <TouchableOpacity style={styles.menuCard}>
          <LinearGradient colors={[primaryColor, secondaryColor]} style={styles.gradientMenu}>
            <Ionicons name="archive" size={32} color="white" />
            <Text style={styles.menuCardText}>View  Data</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  containerCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20
  },
  homeTitle: {
    fontFamily: 'JosefinSans_600SemiBold',
    fontSize: 32,
    color: primaryColor,
    marginBottom: 40,
    textAlign: 'center'
  },
  menuCard: {
    width: '80%',
    borderRadius: 15,
    marginVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  gradientMenu: {
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  menuCardText: {
    fontFamily: 'JosefinSans_600SemiBold',
    fontSize: 20,
    color: 'white',
    marginLeft: 10
  }
});
