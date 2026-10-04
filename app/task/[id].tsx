import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Button, Muted, Page, s, StatusChip, StatusOption, SyncLabel, useColors } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTaskStore } from '../../src/store/useTaskStore';
import { Attachment, Task, TaskStatus } from '../../src/types';
import { localizeError, ru } from '../../src/localization/ru';

function remainingLabel(dueAt: string): string {
  const minutes = Math.round((new Date(dueAt).getTime() - Date.now()) / 60_000);
  if (minutes < 0) return ru.detail.pastDue;
  if (minutes < 60) return ru.detail.remaining(0, minutes);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return ru.detail.remaining(hours, remainingMinutes);
}

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTaskStore(state => state.tasks.find(item => item.id === id));
  return <TaskDetailContent key={`${id}:${task?.updatedAt ?? ''}`} id={id} task={task} />;
}

function TaskDetailContent({ id, task }: { id: string; task: Task | undefined }) {
  const history = useTaskStore(state => state.history);
  const reminderError = useTaskStore(state => state.reminderError);
  const setStatus = useTaskStore(state => state.setStatus);
  const removeTask = useTaskStore(state => state.remove);
  const attachmentsForTask = useTaskStore(state => state.attachmentsForTask);
  const attachmentExists = useTaskStore(state => state.attachmentExists);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [error, setError] = useState('');
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.25;

  useEffect(() => {
    let active = true;
    const currentTask = useTaskStore.getState().tasks.find(item => item.id === id);
    if (!currentTask) return () => { active = false; };
    void attachmentsForTask(currentTask.id).then(items => {
      if (!active) return;
      setAttachments(items);
      setUnavailable(items.filter(item => !attachmentExists(item.localUri)).map(item => item.id));
    }).catch(reason => {
      if (active) setError(localizeError(reason, ru.errors.loadAttachments));
    });
    return () => { active = false; };
  }, [id, task?.updatedAt, attachmentsForTask, attachmentExists]);

  async function changeStatus(status: TaskStatus) {
    if (!task) return;
    setError('');
    try { await setStatus(task.id, status); }
    catch (reason) { setError(localizeError(reason, ru.errors.updateStatus)); }
  }

  async function openLocation() {
    if (!task) return;
    const query = task.latitude !== null && task.longitude !== null ? `${task.latitude},${task.longitude}` : task.location;
    try { await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`); }
    catch { setError(ru.errors.openMaps); }
  }

  async function openAttachment(attachment: Attachment) {
    try { await Linking.openURL(attachment.localUri); }
    catch { setError(ru.errors.openAttachment); }
  }

  function confirmDelete() {
    if (!task) return;
    Alert.alert(ru.detail.deleteConfirm, task.title, [
      { text: ru.common.cancel, style: 'cancel' },
      { text: ru.common.delete, style: 'destructive', onPress: () => {
        void removeTask(task.id).then(() => router.replace('/(tabs)')).catch(reason => {
          setError(localizeError(reason, ru.errors.deleteTask));
        });
      } },
    ]);
  }

  if (!task) return <Page safeArea>
    <Text style={[s.title, { color: colors.text, marginBottom: 8 }]}>{ru.form.unavailable}</Text>
    <Muted>{ru.form.notAvailable}</Muted>
    <Button title={ru.form.back} onPress={() => router.replace('/(tabs)')} />
  </Page>;

  const taskHistory = history.filter(entry => entry.taskId === task.id).slice(0, 2);

  return <Page style={{ paddingTop: 8 }}><ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
      <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 21, fontWeight: '700', lineHeight: 27 }}>{task.title}</Text>
      <StatusChip status={task.status} />
    </View>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <Icon name="time-outline" color={colors.primary} size={16} />
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{new Date(task.dueAt).toLocaleString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
      <SyncLabel status={task.syncStatus} />
    </View>
    <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 23, marginBottom: 14 }}>{remainingLabel(task.dueAt)}</Text>
    {reminderError ? <Text accessibilityRole="alert" style={s.error}>{ru.errors.reminder}</Text> : null}

    <Pressable accessibilityRole="button" onPress={() => void openLocation()} android_ripple={{ color: colors.soft }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 16, overflow: 'hidden' }}>
      <Icon name="location" size={19} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{task.location}</Text>
        {task.latitude !== null && task.longitude !== null ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{task.latitude}, {task.longitude}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}><Icon name="map-outline" size={14} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{ru.detail.openMaps}</Text></View>
      </View>
      <Icon name="arrow-forward" color={colors.primary} size={17} />
    </Pressable>

    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 5 }}>{ru.detail.description}</Text>
    <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>{task.description}</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{ru.detail.attachments(attachments.length)}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/task/new?id=${task.id}`)}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{ru.common.edit}</Text></Pressable>
    </View>
    {attachments.length === 0 ? <Muted>{ru.detail.noImages}</Muted> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
      {attachments.map(item => unavailable.includes(item.id)
        ? <View key={item.id} style={{ width: 112, height: 84, borderRadius: 10, backgroundColor: colors.surfaceRaised, justifyContent: 'center', alignItems: 'center', padding: 6 }}><Icon name="alert-circle-outline" color={colors.danger} size={19} /><Text numberOfLines={2} style={{ color: colors.danger, fontSize: 10, textAlign: 'center' }}>{ru.detail.unavailableImage}</Text></View>
        : item.type === 'image'
          ? <Image key={item.id} accessible accessibilityLabel={`${ru.form.attachmentType.image}: ${item.fileName}`} source={{ uri: item.localUri }} onError={() => setUnavailable(current => [...current, item.id])} style={{ width: 112, height: 84, borderRadius: 10, backgroundColor: colors.surfaceRaised }} resizeMode="cover" />
          : <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${ru.detail.openAttachment}: ${item.fileName}`} onPress={() => void openAttachment(item)} style={{ width: 112, height: 84, borderRadius: 10, backgroundColor: colors.surfaceRaised, justifyContent: 'center', alignItems: 'center', padding: 7 }}>
            <Icon name={item.type === 'video' ? 'videocam-outline' : 'document-text-outline'} color={colors.primary} size={22} />
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 10, fontWeight: '600', marginTop: 4 }}>{ru.form.attachmentType[item.type]}</Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 9, marginTop: 2, maxWidth: 98 }}>{item.fileName}</Text>
          </Pressable>)}
    </ScrollView>}

    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 7, marginBottom: 8 }}>{ru.detail.updateStatus}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
      {(['new', 'in_progress', 'completed', 'cancelled'] as const).map(status => <StatusOption key={status} status={status} selected={task.status === status} onPress={() => void changeStatus(status)} />)}
    </View>
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}

    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 6 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{ru.detail.activity}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/history')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{ru.detail.viewAll}</Text></Pressable>
    </View>
    {taskHistory.length ? taskHistory.map(entry => <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Icon name="ellipse" color={colors.primary} size={9} />
      <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.text, fontSize: 12 }}>{ru.history.events[entry.action] ?? ru.history.events.task_edited}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{ru.detail.byYou}</Text></View>
      <Text style={{ color: colors.muted, fontSize: 10 }}>{new Date(entry.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>) : <Muted>{ru.detail.noActivity}</Muted>}

    <View style={{ flexDirection: compact ? 'column' : 'row', gap: 9, marginTop: 15 }}>
      <View style={{ flex: 1 }}><Button title={ru.detail.editTask} onPress={() => router.push(`/task/new?id=${task.id}`)} /></View>
      <View style={{ flex: 1 }}><Button title={ru.common.delete} danger secondary onPress={confirmDelete} /></View>
    </View>
  </ScrollView></Page>;
}
