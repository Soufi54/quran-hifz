import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'UthmanicHafs': require('../assets/fonts/UthmanicHafs.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D2818' }}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

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
        <Stack.Screen
          name="settings/reciter"
          options={{
            title: 'Recitateur',
            headerBackTitle: 'Retour',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="settings/translation"
          options={{
            title: 'Traduction',
            headerBackTitle: 'Retour',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="settings/tafsir"
          options={{
            title: 'Tafsir',
            headerBackTitle: 'Retour',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}
