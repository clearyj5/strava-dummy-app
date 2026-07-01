// TypeScript type definitions for Strava API responses

// Activity summary from activities list endpoint
export interface SummaryActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string; // "Run", "Ride", etc.
  sport_type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number; // bpm
  average_cadence?: number; // rpm or spm
}

// Individual lap data within an activity
export interface Lap {
  id: number;
  name: string;
  elapsed_time: number; // seconds
  moving_time: number; // seconds
  start_date: string;
  distance: number; // meters
  start_index: number;
  end_index: number;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number; // bpm
  max_heartrate?: number; // bpm
  average_cadence?: number; // rpm or spm
}
// Detailed activity with laps (extends SummaryActivity)

export interface DetailedActivity extends SummaryActivity {
  description?: string;
  calories?: number;
  laps: Lap[];
}
// Stream data array (time-series data points)

export interface StreamData {
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

// Collection of available stream types for an activity
export interface StreamSet {
  heartrate?: StreamData;
  altitude?: StreamData;
  cadence?: StreamData;
  velocity_smooth?: StreamData;
}

// Calculated statistics for a single lap
export interface LapStatistics {
  lapNumber: number;
  lapName: string;
  lapDistance: number;
  lapMovingTime: number;
  maxCadence: number | null;
  maxElevation: number | null;
  minElevation: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  maxSpeed: number | null;
}
