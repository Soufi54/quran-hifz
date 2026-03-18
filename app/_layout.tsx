import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1B4332' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="surah/[id]"
          options={{ title: 'Lecture', headerBackTitle: 'Retour' }}
        />
        <Stack.Screen
          name="quiz/[surahId]"
          options={{ title: 'Quiz', headerBackTitle: 'Retour', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
