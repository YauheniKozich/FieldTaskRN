import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AnimatedReveal, Button, Card, Muted, Page, ScreenHeader, s, StatusChip, SyncLabel, useColors } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTaskStore } from '../../src/store/useTaskStore';
import { Task } from '../../src/types';
import { localizeError, ru } from '../../src/localization/ru';

type SortMode = 'created' | 'due' | 'status';
type TaskFilter = 'all' | 'today' | 'in_progress';

function compareTasks(a: Task, b: Task, mode: SortMode): number {
  if (mode === 'due') return a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id);
  if (mode === 'status') return a.status.localeCompare(b.status) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function dueLabel(value: string): string {
  const date = new Date(value);
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday(value)) return `Сегодня, ${time}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Завтра, ${time}`;
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`;
}

function duePresentation(task: Task, colors: ReturnType<typeof useColors>) {
  const isOpen = task.status === 'new' || task.status === 'in_progress';
  const remainingMs = new Date(task.dueAt).getTime() - Date.now();
  if (isOpen && remainingMs < 0) {
    return { label: `${ru.tasks.overdue} · ${dueLabel(task.dueAt)}`, color: colors.danger, backgroundColor: colors.dangerSoft, urgent: true };
  }
  if (isOpen && remainingMs <= 2 * 60 * 60 * 1000) {
    return { label: `${ru.tasks.dueSoon} · ${dueLabel(task.dueAt)}`, color: colors.warning, backgroundColor: colors.warningSoft, urgent: true };
  }
  return { label: dueLabel(task.dueAt), color: colors.text, backgroundColor: 'transparent', urgent: false };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return ru.tasks.greetingMorning;
  if (hour < 18) return ru.tasks.greetingAfternoon;
  return ru.tasks.greetingEvening;
}

function TaskListCard({ task, statusTint, onMore }: { task: Task; statusTint: string; onMore: () => void }) {
  const colors = useColors();
  const due = duePresentation(task, colors);
  const attachmentsForTask = useTaskStore(state => state.attachmentsForTask);
  const attachmentExists = useTaskStore(state => state.attachmentExists);
  const [preview, setPreview] = useState<{ uri: string; count: number } | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  React.useEffect(() => {
    let active = true;
    void attachmentsForTask(task.id).then(attachments => {
      const images = attachments.filter(attachment => attachment.type === 'image' && attachmentExists(attachment.localUri));
      if (active && images[0]) setPreview({ uri: images[0].localUri, count: images.length });
    }).catch(() => {
      if (active) setPreview(null);
    });
    return () => { active = false; };
  }, [task.id, task.updatedAt, attachmentsForTask, attachmentExists]);

  return <Card style={{ padding: 0, borderLeftWidth: 3, borderLeftColor: due.urgent ? due.color : statusTint }}>
    <View style={{ position: 'relative' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${ru.common.open}: ${task.title}`} onPress={() => router.push(`/task/${task.id}`)} android_ripple={{ color: colors.soft }} style={{ padding: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingRight: 34 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 3 }}>{task.title}</Text>
          {task.description ? <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 11, marginBottom: 8, opacity: 0.85 }}>{task.description}</Text> : null}
        </View>
        {preview ? <View style={{ width: 54, height: 54, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceRaised }}>
          {previewFailed ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="image-outline" color={colors.muted} size={20} /></View> : <Image source={{ uri: preview.uri }} onError={() => setPreviewFailed(true)} style={{ width: 54, height: 54 }} resizeMode="cover" />}
          {preview.count > 1 ? <View style={{ position: 'absolute', right: 3, bottom: 3, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, backgroundColor: '#101828CC' }}><Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>+{preview.count - 1}</Text></View> : null}
        </View> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <View style={{ minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: due.urgent ? 8 : 0, borderRadius: 8, backgroundColor: due.backgroundColor, flexShrink: 1 }}>
          <Icon name="time-outline" size={14} color={due.color} />
          <Text numberOfLines={1} style={{ color: due.color, fontSize: 12, fontWeight: due.urgent ? '700' : '600', flexShrink: 1 }}>{due.label}</Text>
        </View>
        <StatusChip status={task.status} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
          <Icon name="location-outline" size={13} color={colors.muted} />
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, flex: 1 }}>{task.location}</Text>
        </View>
        <SyncLabel status={task.syncStatus} compact />
      </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={ru.tasks.actionAccessibility(task.title)} hitSlop={4} onPress={onMore} android_ripple={{ color: colors.soft }} style={{ position: 'absolute', right: 3, top: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, overflow: 'hidden' }}>
        <Icon name="ellipsis-vertical" color={colors.muted} size={18} />
      </Pressable>
    </View>
  </Card>;
}

export default function TasksScreen() {
  const tasks = useTaskStore(state => state.tasks);
  const loading = useTaskStore(state => state.loading);
  const loadError = useTaskStore(state => state.error);
  const init = useTaskStore(state => state.init);
  const sort = useTaskStore(state => state.sort);
  const setSort = useTaskStore(state => state.setSort);
  const removeTask = useTaskStore(state => state.remove);
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.25;
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');

  const todayCount = tasks.filter(task => isToday(task.dueAt)).length;
  const inProgressCount = tasks.filter(task => task.status === 'in_progress').length;
  const filteredTasks = useMemo(() => tasks
    .filter(task => filter !== 'today' || isToday(task.dueAt))
    .filter(task => filter !== 'in_progress' || task.status === 'in_progress')
    .filter(task => {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      return !normalizedQuery || `${task.title} ${task.location} ${task.description}`.toLocaleLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => compareTasks(a, b, sort)), [tasks, filter, query, sort]);

  function confirmDelete(task: Task) {
    Alert.alert(ru.tasks.deleteConfirm, task.title, [
      { text: ru.common.cancel, style: 'cancel' },
      { text: ru.common.delete, style: 'destructive', onPress: () => {
        void removeTask(task.id).catch(error => setActionError(error instanceof Error ? error.message : 'Could not delete task.'));
      } },
    ]);
  }

  function showTaskActions(task: Task) {
    Alert.alert(ru.tasks.actions, task.title, [
      { text: ru.common.edit, onPress: () => router.push(`/task/new?id=${task.id}`) },
      { text: ru.common.delete, style: 'destructive', onPress: () => confirmDelete(task) },
      { text: ru.common.cancel, style: 'cancel' },
    ]);
  }

  function showSortOptions() {
    Alert.alert(ru.tasks.sort, undefined, [
      { text: ru.tasks.newest, onPress: () => setSort('created') },
      { text: ru.tasks.due, onPress: () => setSort('due') },
      { text: ru.tasks.status, onPress: () => setSort('status') },
    ], { cancelable: true });
  }

  const filters: { id: TaskFilter; label: string; count: number }[] = [
    { id: 'all', label: ru.tasks.all, count: tasks.length },
    { id: 'today', label: ru.tasks.today, count: todayCount },
    { id: 'in_progress', label: ru.tasks.inProgress, count: inProgressCount },
  ];

  return <Page safeArea style={{ paddingHorizontal: 16, paddingTop: 8 }}>
    <FlatList
      data={filteredTasks}
      keyExtractor={task => task.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 92, flexGrow: 1 }}
      ListHeaderComponent={<>
        <ScreenHeader title={<>{greeting()} <Icon name="sunny-outline" color={colors.accent} size={22} /></>} subtitle={ru.tasks.count(tasks.length, todayCount)} />
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          {filters.map(item => {
            const selected = filter === item.id;
            return <Pressable key={`${item.id}-${colors.bg}`} accessibilityRole="radio" accessibilityLabel={`${item.label}, ${item.count}`} accessibilityState={{ selected }} hitSlop={3} onPress={() => setFilter(item.id)} android_ripple={{ color: colors.soft }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 13, backgroundColor: selected ? colors.primary : colors.surfaceRaised, overflow: 'hidden' }}>
              <Text style={{ color: selected ? colors.onPrimary : colors.text, fontSize: 12, fontWeight: selected ? '600' : '500' }}>{item.label} <Text style={{ color: selected ? colors.onPrimary : colors.muted }}>{item.count}</Text></Text>
            </Pressable>;
          })}
        </View>
        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.card }}>
            <Icon name="search-outline" color={colors.muted} size={19} />
            <TextInput accessibilityLabel={ru.tasks.search} value={query} onChangeText={setQuery} placeholder={ru.tasks.search} placeholderTextColor={colors.muted} selectionColor={colors.primary} style={{ flex: 1, color: colors.text, paddingVertical: 8, fontSize: 14 }} />
          </View>
          <Pressable key={`sort-${colors.bg}`} accessibilityRole="button" accessibilityLabel={`${ru.tasks.sort}: ${sort === 'created' ? ru.tasks.newest : sort === 'due' ? ru.tasks.due : ru.tasks.status}`} hitSlop={3} onPress={showSortOptions} android_ripple={{ color: colors.soft }} style={{ minWidth: compact ? undefined : 124, minHeight: 44, alignSelf: compact ? 'flex-end' : undefined, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
            <Icon name="options-outline" color={colors.text} size={18} />
            <View><Text style={{ color: colors.muted, fontSize: 9 }}>{ru.tasks.sort}</Text><Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{sort === 'created' ? ru.tasks.newest : sort === 'due' ? ru.tasks.due : ru.tasks.status}</Text></View>
          </Pressable>
        </View>
        {loadError || actionError ? <Text accessibilityRole="alert" style={s.error}>{loadError ? localizeError(new Error(loadError), ru.errors.loadTasks) : localizeError(actionError, ru.errors.deleteTask)}</Text> : null}
        {loadError ? <Button title={ru.common.retry} onPress={() => void init()} /> : null}
      </>}
      ListEmptyComponent={loading ? <Muted>{ru.tasks.loading}</Muted> : <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>{query || filter !== 'all' ? ru.tasks.noMatches : ru.tasks.noTasks}</Text>
        <Muted>{query || filter !== 'all' ? ru.tasks.adjustSearch : ru.tasks.firstTask}</Muted>
        {query || filter !== 'all' ? <Pressable accessibilityRole="button" onPress={() => { setQuery(''); setFilter('all'); }} style={{ paddingTop: 12 }}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{ru.tasks.resetFilters}</Text></Pressable> : null}
      </Card>}
      renderItem={({ item }) => {
        const statusTint = item.status === 'completed' ? colors.success : item.status === 'cancelled' ? colors.danger : item.status === 'in_progress' ? colors.primary : colors.line;
        return <AnimatedReveal key={item.id}><TaskListCard key={item.updatedAt} task={item} statusTint={statusTint} onMore={() => showTaskActions(item)} /></AnimatedReveal>;
      }}
    />

    <Pressable accessibilityRole="button" accessibilityLabel={ru.common.createTask} onPress={() => router.push('/task/new')} android_ripple={{ color: colors.onPrimary }} style={({ pressed }) => ({ position: 'absolute', zIndex: 10, right: 18, bottom: 14, minHeight: 54, borderRadius: 27, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, elevation: pressed ? 4 : 8, opacity: pressed ? 0.92 : 1 })}>
      <Icon name="add" color={colors.onPrimary} size={22} />
    </Pressable>
  </Page>;
}
