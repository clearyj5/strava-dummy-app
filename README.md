# Strava Activity Viewer

A React Native mobile app built with Expo that connects to the Strava API and lets you browse your activities and dive into per-lap performance data.

## Features

- **OAuth 2.0 authentication** — sign in securely with your Strava account
- **Activity feed** — view all your activities with distance, moving time, and elevation gain at a glance
- **Activity detail** — tap any activity for a full breakdown: pace, heart rate, cadence, and more
- **Lap statistics** — per-lap analysis including max/min heart rate, max cadence, max/min elevation, and max speed, powered by the Strava Streams API

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- Expo CLI:
  ```bash
  npm install -g expo-cli
  ```
- For iOS: Xcode (Mac only) — install from the Mac App Store
- For Android: [Android Studio](https://developer.android.com/studio) with an AVD configured

## Strava API Setup

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and create an API application (the details don't matter)
2. Upload any image when prompted
3. On the application details page, copy your **Client ID** and **Client Secret**
4. In `app/index.tsx`, set `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` to those values

> Don't have any activities yet? The `/data` folder contains two sample `.fit` files you can upload to Strava via **+ → Upload Activity → File**.

## Running the App

```bash
npm install
npx expo start
```

- Press `i` to open the iOS simulator
- Press `a` to open the Android emulator

Tap **Connect with Strava** to go through the OAuth flow. Once authenticated you'll land straight on your activity feed.
