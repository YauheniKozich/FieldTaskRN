import React from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Muted, Page, ScreenHeader, useColors } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { CANDIDATE_CODE } from '../../src/config/app';
import { useTaskStore } from '../../src/store/useTaskStore';
import { localizeNotice, ru } from '../../src/localization/ru';

const themes = [
  { id: 'system', label: ru.settings.system, icon: 'phone-portrait-outline' },
  { id: 'light', label: ru.settings.light, icon: 'sunny-outline' },
  { id: 'dark', label: ru.settings.dark, icon: 'moon-outline' },
] as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 10 }}>{children}</Text>;
}

export default function SettingsScreen() {
  const theme = useTaskStore(state => state.theme);
  const setTheme = useTaskStore(state => state.setTheme);
  const sync = useTaskStore(state => state.sync);
  const demoNotification = useTaskStore(state => state.demoNotification);
  const notice = useTaskStore(state => state.notice);
  const reminderError = useTaskStore(state => state.reminderError);
  const clearNotice = useTaskStore(state => state.clearNotice);
  const tasks = useTaskStore(state => state.tasks);
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 350 || fontScale > 1.25;
  const pendingCount = tasks.filter(task => task.syncStatus !== 'synced').length;

  return <Page safeArea style={{ paddingTop: 8 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <ScreenHeader title={ru.tabs.settings} subtitle={ru.settings.subtitle} />
      <SectionTitle>{ru.settings.appearance}</SectionTitle>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {themes.map(item => {
          const selected = theme === item.id;
          return <Pressable key={`${item.id}-${theme}`} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ selected }} hitSlop={3} onPress={() => void setTheme(item.id)} style={({ pressed }) => ({ flex: 1, minWidth: compact ? '45%' : 0, minHeight: 76, justifyContent: 'center', alignItems: 'center', gap: 7, borderRadius: 12, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.soft : colors.card, overflow: 'hidden', opacity: pressed ? 0.82 : 1 })}>
            <Icon name={item.icon} color={selected ? colors.primary : colors.text} size={19} />
            <Text style={{ color: selected ? colors.onSoft : colors.text, fontSize: 12, fontWeight: selected ? '600' : '500' }}>{item.label}</Text>
          </Pressable>;
        })}
      </View>

      <SectionTitle>{ru.settings.notifications}</SectionTitle>
      <View style={{ backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
          <Icon name="notifications-outline" color={colors.primary} size={19} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{ru.settings.reminders}</Text>
            <Muted>{ru.settings.localNotifications}</Muted>
          </View>
          <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>{ru.settings.auto}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 14 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={ru.settings.demo} accessibilityHint={ru.settings.demoHint} hitSlop={2} onPress={() => void demoNotification()} android_ripple={{ color: colors.soft }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
          <Icon name="play-circle-outline" color={colors.primary} size={21} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{ru.settings.demo}</Text>
            <Muted>{ru.settings.demoHint}</Muted>
          </View>
          <Icon name="chevron-forward" color={colors.muted} size={18} />
        </Pressable>
      </View>

      <SectionTitle>{ru.settings.sync}</SectionTitle>
      <View style={{ backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 14, padding: 14 }}>
        <View style={{ flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'center', gap: 12 }}>
          <Icon name="cloud-outline" color={colors.primary} size={21} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{pendingCount ? ru.settings.waiting(pendingCount) : ru.settings.allSynced}</Text>
            <Muted>{ru.settings.offlineSave}</Muted>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={ru.settings.syncNow} hitSlop={3} onPress={() => void sync()} android_ripple={{ color: colors.onPrimary }} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.primary, overflow: 'hidden' }}>
            <Text style={{ color: colors.onPrimary, fontSize: 12, fontWeight: '600' }}>{ru.settings.syncNow}</Text>
          </Pressable>
        </View>
      </View>

      {notice ? <Pressable accessibilityRole="alert" onPress={clearNotice} style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.soft }}>
        <Text style={{ color: colors.onSoft, fontSize: 13, lineHeight: 19 }}>{localizeNotice(notice)}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 5, fontSize: 12 }}>{ru.settings.dismiss}</Text>
      </Pressable> : null}
      {reminderError ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 12 }}>{ru.errors.reminder}</Text> : null}

      <SectionTitle>{ru.settings.about}</SectionTitle>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>FieldTask</Text>
        <Muted>{ru.settings.productHint}</Muted>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>{ru.settings.version}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{ru.settings.candidateCode}: {CANDIDATE_CODE}</Text>
      </View>
    </ScrollView>
  </Page>;
}
