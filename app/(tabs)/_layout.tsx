import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';
import { Icon } from '../../src/components/Icon';
import { useColors } from '../../src/components/ui';
import { ru } from '../../src/localization/ru';

type TabIconName = 'tasks' | 'map' | 'history' | 'settings';

function TabIcon({ name, color, focused, indicatorColor }: { name: TabIconName; color: ColorValue; focused: boolean; indicatorColor: string }) {
  const iconName = name === 'tasks' ? 'list-outline' : name === 'map' ? 'map-outline' : name === 'history' ? 'time-outline' : 'settings-outline';
  return <View style={{ width: 54, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? indicatorColor : 'transparent' }}>
    <Icon name={iconName} color={color} size={21} />
  </View>;
}

export default function TabLayout() {
  const colors = useColors();

  return <Tabs screenOptions={{
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    headerTitleAlign: 'left',
    headerTitleStyle: { fontWeight: '600', fontSize: 22 },
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, borderTopWidth: 0.5, minHeight: 68, paddingTop: 4, paddingBottom: 4, elevation: 0 },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontWeight: '500', fontSize: 12, marginTop: 0 },
    tabBarItemStyle: { gap: 0 },
  }}>
    <Tabs.Screen name="index" options={{
      title: ru.tabs.tasks, tabBarLabel: ru.tabs.tasks, headerShown: false,
      tabBarIcon: ({ color, focused }) => <TabIcon name="tasks" color={color} focused={focused} indicatorColor={colors.soft} />,
    }} />
    <Tabs.Screen name="map" options={{
      title: ru.tabs.map, tabBarLabel: ru.tabs.map, headerShown: false,
      tabBarIcon: ({ color, focused }) => <TabIcon name="map" color={color} focused={focused} indicatorColor={colors.soft} />,
    }} />
    <Tabs.Screen name="history" options={{
      title: ru.tabs.history, tabBarLabel: ru.tabs.history, headerShown: false,
      tabBarIcon: ({ color, focused }) => <TabIcon name="history" color={color} focused={focused} indicatorColor={colors.soft} />,
    }} />
    <Tabs.Screen name="settings" options={{
      title: ru.tabs.settings, tabBarLabel: ru.tabs.settings, headerShown: false,
      tabBarIcon: ({ color, focused }) => <TabIcon name="settings" color={color} focused={focused} indicatorColor={colors.soft} />,
    }} />
  </Tabs>;
}
