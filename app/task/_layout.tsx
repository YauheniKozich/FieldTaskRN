import { Stack } from 'expo-router';
import { ru } from '../../src/localization/ru';
import { useColors } from '../../src/components/ui';

export default function TaskLayout() {
  const colors = useColors();
  return <Stack screenOptions={{
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    headerTitleStyle: { fontSize: 20, fontWeight: '600' },
    headerBackTitle: '',
    contentStyle: { backgroundColor: colors.bg },
  }}>
    <Stack.Screen name="[id]" options={{ title: ru.detail.taskDetails }} />
    <Stack.Screen name="new" options={{ title: ru.form.task }} />
  </Stack>;
}
