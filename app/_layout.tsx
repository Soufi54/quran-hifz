import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0D2818',
          },
          headerTintColor: '#D4AF37',
          headerTitleStyle: {
            fontWeight: '700',
            color: '#fff',
          },
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="surah/[id]"
          options={{
            title: 'Lecture',
            headerBackTitle: 'Retour',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="quiz/[surahId]"
          options={{
            title: 'Quiz',
            headerBackTitle: 'Retour',
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}
