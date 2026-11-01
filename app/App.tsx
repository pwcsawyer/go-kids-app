import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LessonBrowser } from './src/screens/LessonBrowser';

function itemFromUrl(): string | undefined {
  if (typeof window === 'undefined' || typeof window.location?.search !== 'string') return undefined;
  return new URLSearchParams(window.location.search).get('item') ?? undefined;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LessonBrowser initialItemId={itemFromUrl()} />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
