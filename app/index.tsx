// Authentication screen - handles Strava OAuth login flow
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, ActivityIndicator, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { useRouter } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";

// Complete auth session when returning from browser
WebBrowser.maybeCompleteAuthSession();

// Strava OAuth endpoints
const STRAVA_CONFIG = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
  revocationEndpoint: "https://www.strava.com/oauth/deauthorize",
};

// Add your Strava API credentials here
const STRAVA_CLIENT_ID = ""; // TODO: You must set this to your Strava app's client ID
const STRAVA_CLIENT_SECRET = ""; // TODO: You must set this to your Strava app's client secret
const STRAVA_REDIRECT_URI = makeRedirectUri({
  scheme: "myapp",
  preferLocalhost: true,
});

export default function AuthScreen() {
  const router = useRouter();
  const { accessToken, setAccessToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasHandledCallback, setHasHandledCallback] = useState(false);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      clientSecret: STRAVA_CLIENT_SECRET,
      scopes: ["activity:read_all"],
      redirectUri: STRAVA_REDIRECT_URI,
    },
    STRAVA_CONFIG
  );

  // Redirect to activities if already authenticated
  useEffect(() => {
    if (accessToken && !isProcessing) {
      router.replace('/activities');
    }
  }, [accessToken, isProcessing, router]);

  // Handle OAuth callback from deep link
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url || isProcessing || hasHandledCallback) return;
      
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          setIsProcessing(true);
          setHasHandledCallback(true);
          
          const exchangeResponse = await exchangeCodeAsync(
            {
              clientId: STRAVA_CLIENT_ID,
              code,
              redirectUri: STRAVA_REDIRECT_URI,
              extraParams: {
                client_secret: STRAVA_CLIENT_SECRET,
              },
            },
            { tokenEndpoint: STRAVA_CONFIG.tokenEndpoint }
          );
          
          setAccessToken(exchangeResponse.accessToken);
          router.replace('/activities');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setIsProcessing(false);
        setHasHandledCallback(false);
      }
    };

    // Check initial URL when app opens from OAuth callback
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for URL changes (when app is already open)
    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [isProcessing, hasHandledCallback, setAccessToken, router]);

  // Trigger OAuth flow when button is pressed
  const onPressStravaAuth = useCallback(async () => {
    if (request) {
      await promptAsync();
    }
  }, [request, promptAsync]);

  // Show loading indicator while processing OAuth
  if (isProcessing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={styles.loadingText}>Connecting to Strava...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Strava Challenge</Text>
        <Text style={styles.subtitle}>
          Connect your Strava account to view your activities
        </Text>
        <TouchableOpacity
          onPress={onPressStravaAuth}
          style={styles.button}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Connect with Strava</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#FC4C02',
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
