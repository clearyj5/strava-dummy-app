# Runna Strava Challenge

## Challenge

You are working for a early stage fitness startup. They want to experiment with the Strava API to see what type of information they can display in a React-Native mobile app. You have been brought in as a Full Stack engineer and your first task is to research the Strava API docs and integrate with a RN app. The tech lead has created a bare bones repo to help you get started and has also installed <https://docs.expo.dev/versions/latest/sdk/auth-session/> which will handle to oAuth2.0 authetication flow with Strava.

They have also left intructions on how to get the project working on your local environment

## Setup and Running Guide

The following steps will help you get the project set up and running on your local machine.

## Prerequisites

Before you begin, make sure you have the following tools installed on your machine:

1. **Node.js** (LTS version recommended): [Download here](https://nodejs.org/)
2. **Expo CLI**: Install globally via npm:
   ```bash
   npm install -g expo-cli
   ```
3. **Git**: You will need Git to clone the repository: [Download here](https://git-scm.com/)

### Additional Tools (Platform-Specific)

- **iOS (for macOS users only)**:

  - Xcode: Install from the Mac App Store.
  - Command Line Tools: Install via Xcode → Preferences → Locations.

- **Android**:
  - Android Studio: [Download here](https://developer.android.com/studio)
  - Set up an Android Virtual Device (AVD) in Android Studio for running the app on an emulator.

## Setting up the Strava API

1. To use the Strava api, you will need a client id and client secret
2. You can use your own Strava account for this if you wish. If so, skip to part 5
3. Go to <https://www.strava.com/register/free> and sign up using email
4. Once signed up for a free account, you can upload some fake activities
    1. Tap the **+** icon in the top right followed by **Upload Activity**
    2. Tap **File** from the available options
    3. In the /data folder of this repo, you will see two .fit files
    4. On Strava, click **Choose files** and then choose these two files to uplad
    5. While uploading, choose **Only You** for **Who Can See** under **Privacy Controls** setting
5. Navigate to <https://www.strava.com/settings/api> and create an api application.
   The details you use are not important
6. You will then be asked to upload an image for your application. Use any image at all.
7. You will then be redirected to the application details page. Here you will see **Client ID** and **Client Secret**
8. Copy both these values and replace the values for STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in this repo
9. You are now ready to access the Strava api using your own application.


## Running the project

1. Open terminal at the project root
2. Run `npm install`
3. Run `npx expo start`
4. Press `i` to open the iOS simulator
5. OR, Press `a` to open the Anroid simulator

### Strava Authentication

Press `Strava auth` button on the simulator and it will take you through the Strava auth flow. 

Please use the email you entered in the above step to access either your own account, or your newly setup test account.

Your accessToken will be printed to the console (which can be seen in your terminal on tab where you started your expo project, i.e `npx expo start`). You will use this accessToken to call the Strava API.

<img height="400" alt="image" src="https://user-images.githubusercontent.com/5293650/199756290-3ca777b8-bc24-4088-a3c7-6d0bf3c2e254.png">

## Tasks

1. Fetch a list of activities using the Strava API and display on the homescreen of the app (you can decide what summary information you want to display i.e. distance, time). Some things to keep in mind:
    - Can you think of a nice way to handle the strava access token so that it can be re-used throughout the different screens
2. Allow a user to click on an activity in the list and display more information about the activity on a new screen.
    - If you want to use a navigation library you can use https://docs.expo.dev/router/introduction/ however its not a requirement for this challenge
3. Use the Activity Streams API to fetch the `heartRate, elevation(altitude), cadence, speed(velocity_smooth)` for an activity (HINT: the query parameters will be something like `?keys=heartrate,altitude,velocity_smooth&key_by_type=true`)
4. Using the `laps` and/or `streams` data from an activity we want to display the following data points for each lap:
    - maxCadence
    - maxElevation
    - minElevation
    - maxHeartRate
    - minHeartRate
    - maxSpeed
5. Display a list of laps with above data points for each activity

## Keep in mind

- Use the native fetch API (https://reactnative.dev/docs/network) to make the Strava API requests, there is no need to install another library to do this
- Please dont spend more than 3 hours on this challenge
- There are no designs to work to. We're more concerned with functionality at this stage. You will have to make some UI / layout choices.
- If you have questions feel free to ask them.
- There is no need to push your changes up to the remote branch, once done please send back to use in a ZIP file (remember to delete node_modules before zipping up)

Have fun. We look forward to seeing your work!
