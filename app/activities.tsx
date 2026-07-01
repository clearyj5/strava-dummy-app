// Activities list screen - displays all Strava activities with summary information
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { fetchActivities } from '../src/services/stravaApi';
import { SummaryActivity } from '../src/types/strava';
import { formatDistance, formatTime } from '../src/utils/lapCalculations';

export default function ActivitiesScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  
  // State for activities list and UI states
  const [activities, setActivities] = useState<SummaryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch activities from Strava API
  const loadActivities = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      setError(null);
      const data = await fetchActivities(accessToken);
      setActivities(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load activities';
      console.error('Error loading activities:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  // Redirect to auth if no token
  useEffect(() => {
    if (!accessToken) {
      router.replace('/');
    }
  }, [accessToken, router]);

  // Load activities when token becomes available
  useEffect(() => {
    if (accessToken) {
      loadActivities();
    }
  }, [accessToken, loadActivities]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivities();
  }, [loadActivities]);

  // Render individual activity card
  const renderActivity = ({ item }: { item: SummaryActivity }) => {
    const date = new Date(item.start_date_local).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => router.push(`/activity/${item.id}`)}
      >
        <View style={styles.activityHeader}>
          <Text style={styles.activityName}>{item.name}</Text>
          <Text style={styles.activityType}>{item.type}</Text>
        </View>
        <Text style={styles.activityDate}>{date}</Text>
        <View style={styles.activityStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{formatDistance(item.distance)} km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(item.moving_time)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Elevation</Text>
            <Text style={styles.statValue}>{Math.round(item.total_elevation_gain)} m</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadActivities}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No activities found</Text>
        <Text style={styles.emptySubtext}>
          Upload some activities to Strava to see them here
        </Text>
      </View>
    );
  }

  // Activities list with pull-to-refresh
  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item: SummaryActivity) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FC4C02"
          />
        }
      />
    </View>
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
  listContent: {
    padding: 16,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  activityType: {
    fontSize: 12,
    color: '#FC4C02',
    fontWeight: '600',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
