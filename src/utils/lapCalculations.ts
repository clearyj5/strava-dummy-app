// Lap statistics and formatting utilities
import { Lap, StreamSet, LapStatistics } from '../types/strava';

// Calculate min/max metrics for each lap from stream data
export function calculateLapStatistics(
  laps: Lap[],
  streams: StreamSet
): LapStatistics[] {
  return laps.map((lap, index) => {
    const startIndex = lap.start_index;
    const endIndex = lap.end_index;

    // Extract stream segments for this lap using indices
    const cadenceSegment = streams.cadence?.data.slice(startIndex, endIndex + 1);
    const elevationSegment = streams.altitude?.data.slice(startIndex, endIndex + 1);
    const heartRateSegment = streams.heartrate?.data.slice(startIndex, endIndex + 1);
    const speedSegment = streams.velocity_smooth?.data.slice(startIndex, endIndex + 1);

    // Calculate max/min values for each metric
    return {
      lapNumber: index + 1,
      lapName: lap.name || `Lap ${index + 1}`,
      lapDistance: lap.distance,
      lapMovingTime: lap.moving_time,
      maxCadence: cadenceSegment ? Math.max(...cadenceSegment) : null,
      maxElevation: elevationSegment ? Math.max(...elevationSegment) : null,
      minElevation: elevationSegment ? Math.min(...elevationSegment) : null,
      maxHeartRate: heartRateSegment ? Math.max(...heartRateSegment) : null,
      minHeartRate: heartRateSegment ? Math.min(...heartRateSegment) : null,
      maxSpeed: speedSegment ? Math.max(...speedSegment) : null,
    };
  });
}

// Format seconds to MM:SS or HH:MM:SS
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Convert meters to kilometers with 2 decimal places
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km.toFixed(2);
}

export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond === 0) return '--:--';
  const minutesPerKm = 1000 / (metersPerSecond * 60);
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.floor((minutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
