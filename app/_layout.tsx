// Root layout component - wraps all screens with authentication context and navigation
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    // Provide auth context to all child screens
    <AuthProvider>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Strava Auth',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="activities" 
          options={{ 
            title: 'Your Recent Activities',
            headerShown: true,
            headerBackVisible: false
          }} 
        />
        <Stack.Screen 
          name="activity/[id]" 
          options={{ 
            title: 'Activity Details',
            headerShown: true 
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}
