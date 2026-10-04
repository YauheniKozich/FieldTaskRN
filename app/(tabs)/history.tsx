import React, { useMemo, useState } from 'react';
import { Alert, Animated, FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Muted, Page, ScreenHeader, useColors } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTaskStore } from '../../src/store/useTaskStore';
import { HistoryEntry } from '../../src/types';
import { localizeError, ru } from '../../src/localization/ru';

const ACTION_WIDTH = 88;
type ActivityFilter = 'all' | 'tasks' | 'status' | 'sync';

function category(entry: HistoryEntry): Exclude<ActivityFilter, 'all'> {
  if (entry.action.startsWith('sync_')) return 'sync';
  if (entry.action === 'status_changed') return 'status';
  return 'tasks';
}

function dayKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today)) return ru.history.today;
  if (dayKey(value) === dayKey(yesterday)) return ru.history.yesterday;
  return date.toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' });
}

function eventTitle(action: string): string {
  return ru.history.events[action] ?? 'Событие';
}

function eventDescription(item: HistoryEntry): string {
  const quoted = item.description.match(/[“"](.+?)[”"]/u)?.[1];
  if (item.action === 'task_created' && quoted) return ru.history.description.created(quoted);
  if (item.action === 'task_edited' && quoted) return ru.history.description.edited(quoted);
  if (item.action === 'task_deleted' && quoted) return ru.history.description.deleted(quoted);
  if (item.action === 'attachment_added' && quoted) return ru.history.description.attachmentAdded(quoted);
  if (item.action === 'attachment_removed' && quoted) return ru.history.description.attachmentRemoved(quoted);
  if (item.action === 'status_changed') {
    const status = item.description.split('Status changed to ')[1]?.replace(/[.]/gu, '') ?? '';
    const localizedStatus = status === 'in progress' ? ru.status.in_progress : ru.status[status as keyof typeof ru.status];
    return localizedStatus ? ru.history.description.statusChanged(localizedStatus) : ru.history.events.status_changed;
  }
  if (item.action === 'sync_succeeded') {
    const count = Number(item.description.match(/\d+/u)?.[0] ?? 0);
    return ru.history.description.syncSucceeded(count);
  }
  if (item.action === 'sync_failed') return ru.history.description.syncFailed;
  return ru.history.description.unknown;
}

function eventAppearance(action: string, colors: ReturnType<typeof useColors>) {
  if (action.startsWith('sync_')) return { tint: action === 'sync_failed' ? colors.danger : colors.primary, icon: action === 'sync_failed' ? 'alert' as const : 'sync-outline' as const };
  if (action === 'status_changed') return { tint: colors.accent, icon: 'swap-vertical-outline' as const };
  if (action === 'task_deleted' || action === 'attachment_removed') return { tint: colors.danger, icon: 'close' as const };
  if (action === 'attachment_added') return { tint: colors.success, icon: 'add' as const };
  return { tint: colors.primary, icon: 'checkmark' as const };
}

function HistoryRow({ item, last, onDelete }: { item: HistoryEntry; last: boolean; onDelete: () => void }) {
  const colors = useColors();
  const [translateX] = useState(() => new Animated.Value(0));
  const [isOpen, setIsOpen] = useState(false);
  const appearance = eventAppearance(item.action, colors);
  const panResponder = useMemo(() => {
    const startX = isOpen ? -ACTION_WIDTH : 0;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2 && (isOpen ? gesture.dx > 8 : gesture.dx < -8),
      onPanResponderMove: (_event, gesture) => translateX.setValue(Math.min(0, Math.max(-ACTION_WIDTH, startX + gesture.dx))),
      onPanResponderRelease: (_event, gesture) => {
        const open = startX === 0 ? gesture.dx < -40 || gesture.vx < -0.5 : !(gesture.dx > 35 || gesture.vx > 0.5);
        setIsOpen(open);
        Animated.spring(translateX, { toValue: open ? -ACTION_WIDTH : 0, useNativeDriver: true, speed: 24, bounciness: 3 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(translateX, { toValue: startX, useNativeDriver: true }).start(),
    });
  }, [isOpen, translateX]);

  return <View style={styles.timelineRow}>
    <View style={styles.rail}>
      {!last ? <View style={[styles.railLine, { backgroundColor: colors.line }]} /> : null}
      <View style={[styles.eventIcon, { backgroundColor: colors.card, borderColor: appearance.tint }]}>
        <Icon name={appearance.icon} color={appearance.tint} size={13} />
      </View>
    </View>
    <View style={[styles.swipeContainer, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={ru.history.deleteItem} hitSlop={6} onPress={onDelete} style={[styles.deleteAction, { backgroundColor: colors.danger }]}>
        <Text style={styles.deleteText}>{ru.common.delete}</Text>
      </Pressable>
      <Animated.View
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${eventTitle(item.action)}. ${item.description}`}
        accessibilityHint={ru.history.accessibilityHint}
        accessibilityActions={[{ name: 'delete', label: ru.history.deleteItem }]}
        onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === 'delete') onDelete(); }}
        style={[styles.activityCard, { backgroundColor: colors.card, transform: [{ translateX }] }]}
      >
        <View style={styles.activityHeading}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{eventTitle(item.action)}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>{item.description}</Text>
      </Animated.View>
    </View>
  </View>;
}

export default function HistoryScreen() {
  const history = useTaskStore(state => state.history);
  const deleteHistoryEntry = useTaskStore(state => state.deleteHistoryEntry);
  const colors = useColors();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const filtered = useMemo(() => history.filter(entry => filter === 'all' || category(entry) === filter), [history, filter]);

  function removeEntry(id: string) {
    void deleteHistoryEntry(id).catch(error => Alert.alert(ru.history.deleteErrorTitle, localizeError(error, ru.history.retryAgain)));
  }

  const filters: { id: ActivityFilter; label: string }[] = [
    { id: 'all', label: ru.history.all }, { id: 'tasks', label: ru.history.tasks }, { id: 'status', label: ru.history.status }, { id: 'sync', label: ru.history.sync },
  ];

  return <Page safeArea style={{ paddingHorizontal: 16, paddingTop: 8 }}>
    <ScreenHeader title={ru.tabs.history} subtitle={ru.history.subtitle(history.length)} />
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
      {filters.map(item => {
        const selected = filter === item.id;
        return <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ selected }} hitSlop={3} onPress={() => setFilter(item.id)} android_ripple={{ color: colors.soft }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 22, backgroundColor: selected ? colors.primary : colors.surfaceRaised, overflow: 'hidden' }}>
          <Text style={{ color: selected ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: selected ? '600' : '500' }}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
    {filtered.length === 0 ? <View style={{ paddingVertical: 24 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>{history.length === 0 ? ru.history.noActivity : ru.history.noMatches}</Text>
      <Muted>{history.length === 0 ? ru.history.activityWillAppear : ru.history.changeFilter}</Muted>
      {history.length > 0 ? <Pressable accessibilityRole="button" onPress={() => setFilter('all')} style={{ paddingTop: 12 }}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{ru.history.reset}</Text></Pressable> : null}
    </View> : <FlatList
      data={filtered}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom: 16 }}
      renderItem={({ item, index }) => {
        const startsDay = index === 0 || dayKey(filtered[index - 1].createdAt) !== dayKey(item.createdAt);
        const lastInDay = index === filtered.length - 1 || dayKey(filtered[index + 1].createdAt) !== dayKey(item.createdAt);
        return <View>
          {startsDay ? <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 8 }}>{dayLabel(item.createdAt)}</Text> : null}
          <HistoryRow item={{ ...item, description: eventDescription(item) }} last={lastInDay} onDelete={() => removeEntry(item.id)} />
        </View>;
      }}
    />}
  </Page>;
}

const styles = StyleSheet.create({
  timelineRow: { flexDirection: 'row', minHeight: 66 },
  rail: { width: 28, alignItems: 'center', position: 'relative' },
  railLine: { position: 'absolute', width: 2, top: 22, bottom: -8 },
  eventIcon: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  swipeContainer: { flex: 1, minHeight: 58, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  deleteAction: { position: 'absolute', top: 4, right: 4, bottom: 4, width: ACTION_WIDTH - 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  deleteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  activityCard: { flex: 1, minHeight: 58, justifyContent: 'center', paddingHorizontal: 10 },
  activityHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
