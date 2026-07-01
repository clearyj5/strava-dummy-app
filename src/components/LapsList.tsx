// Lap statistics component - displays performance metrics for each lap
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LapStatistics } from '../types/strava';
import { formatDistance, formatTime } from '../utils/lapCalculations';

interface LapsListProps {
  lapStats: LapStatistics[];
}

export default function LapsList({ lapStats }: LapsListProps) {
  // Format metric values, showing 'N/A' for missing data
  const formatValue = (value: number | null, unit: string = ''): string => {
    if (value === null) return 'N/A';
    return `${Math.round(value)}${unit}`;
  };

  // Format speed values from m/s to km/h
  const formatSpeed = (value: number | null): string => {
    if (value === null) return 'N/A';
    const kmh = value * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  // Render lap cards with all metrics
  return (
    <View style={styles.container}>
      {lapStats.map((lap) => (
        <View key={lap.lapNumber} style={styles.lapCard}>
          <View style={styles.lapHeader}>
            <Text style={styles.lapTitle}>
              {lap.lapName}{' '}
              <Text style={styles.lapSubtitle}>
                {formatDistance(lap.lapDistance)} km – {formatTime(lap.lapMovingTime)}
              </Text>
            </Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Max Heart Rate:</Text>
              <Text style={styles.statValue}>
                {formatValue(lap.maxHeartRate, ' bpm')}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Min Heart Rate:</Text>
              <Text style={styles.statValue}>
                {formatValue(lap.minHeartRate, ' bpm')}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Max Cadence:</Text>
              <Text style={styles.statValue}>
                {formatValue(lap.maxCadence, ' spm')}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Max Speed:</Text>
              <Text style={styles.statValue}>{formatSpeed(lap.maxSpeed)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Max Elevation:</Text>
              <Text style={styles.statValue}>
                {formatValue(lap.maxElevation, ' m')}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Min Elevation:</Text>
              <Text style={styles.statValue}>
                {formatValue(lap.minElevation, ' m')}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  lapCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  lapHeader: {
    marginBottom: 12,
  },
  lapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FC4C02',
    marginBottom: 4,
  },
  lapSubtitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 12,
  },
  statsGrid: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
