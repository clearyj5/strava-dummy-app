// Activity detail screen - displays comprehensive activity information and lap statistics
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { fetchActivityById, fetchActivityStreams } from '../../src/services/stravaApi';
import { DetailedActivity, StreamSet, LapStatistics } from '../../src/types/strava';
import { formatDistance, formatTime, formatPace, calculateLapStatistics } from '../../src/utils/lapCalculations';
import LapsList from '../../src/components/LapsList';

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  
  // State for activity data and lap statistics
  const [activity, setActivity] = useState<DetailedActivity | null>(null);
  const [streams, setStreams] = useState<StreamSet | null>(null);
  const [lapStats, setLapStats] = useState<LapStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivityDetails = useCallback(async () => {
    if (!accessToken || !id) {
      router.replace('/');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const activityId = parseInt(id, 10);

      // Fetch basic activity information
      const activityData = await fetchActivityById(accessToken, activityId);
      setActivity(activityData);

      // Attempt to fetch stream data for lap analysis
      try {
        const streamsData = await fetchActivityStreams(accessToken, activityId);
        setStreams(streamsData);

        // Calculate lap statistics if laps are available
        if (activityData.laps && activityData.laps.length > 0) {
          const stats = calculateLapStatistics(activityData.laps, streamsData);
          setLapStats(stats);
        }
      } catch (streamError) {
        console.warn('Failed to load streams:', streamError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
      console.error('Error loading activity:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id, router]);

  useEffect(() => {
    loadActivityDetails();
  }, [loadActivityDetails]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  // Error state with retry option
  if (error || !activity) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Error: {error || 'Activity not found'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadActivityDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format date for display
  const date = new Date(activity.start_date_local).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Activity detail UI with stats and optional lap data
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.activityName}>{activity.name}</Text>
        <View style={styles.typeContainer}>
          <Text style={styles.activityType}>{activity.type}</Text>
        </View>
        <Text style={styles.activityDate}>{date}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(activity.distance)} km</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Moving Time</Text>
          <Text style={styles.statValue}>{formatTime(activity.moving_time)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Elevation Gain</Text>
          <Text style={styles.statValue}>{Math.round(activity.total_elevation_gain)} m</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg Pace</Text>
          <Text style={styles.statValue}>{formatPace(activity.average_speed)} /km</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg Heart Rate</Text>
          <Text style={styles.statValue}>
            {activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : 'N/A'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Cadence</Text>
          <Text style={styles.statValue}>
            {activity.average_cadence ? `${Math.round(activity.average_cadence)} spm` : 'N/A'}
          </Text>
        </View>
      </View>

      {activity.description && (
        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{activity.description}</Text>
        </View>
      )}

      {lapStats.length > 0 ? (
        <View style={styles.lapsSection}>
          <Text style={styles.sectionTitle}>Lap Statistics</Text>
          <LapsList lapStats={lapStats} />
        </View>
      ) : (
        <View style={styles.noLapsCard}>
          <Text style={styles.noLapsText}>
            {activity.laps && activity.laps.length > 0
              ? 'No stream data available for lap analysis'
              : 'This activity does not have lap data'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  activityName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  typeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activityType: {
    fontSize: 14,
    color: '#FC4C02',
    fontWeight: '600',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    margin: '1%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  descriptionCard: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  lapsSection: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
  },
  noLapsCard: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  noLapsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FC4C02',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
