import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayScreen } from './src/screens/PlayScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
