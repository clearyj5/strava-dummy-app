// Strava API service - centralized API calls using native fetch
import { SummaryActivity, DetailedActivity, StreamSet } from '../types/strava';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// Fetch paginated list of athlete's activities
export async function fetchActivities(
  accessToken: string,
  page: number = 1,
  perPage: number = 30
): Promise<SummaryActivity[]> {
  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.statusText}`);
  }

  return response.json();
}

// Fetch detailed information for a specific activity
export async function fetchActivityById(
  accessToken: string,
  activityId: number
): Promise<DetailedActivity> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activity: ${response.statusText}`);
  }

  return response.json();
}

// Fetch time-series stream data (heart rate, elevation, cadence, speed)
export async function fetchActivityStreams(
  accessToken: string,
  activityId: number
): Promise<StreamSet> {
  const keys = 'heartrate,altitude,cadence,velocity_smooth';
  const response = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=${keys}&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch streams: ${response.statusText}`);
  }

  return response.json();
}
