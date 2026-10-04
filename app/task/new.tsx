import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { AnimatedReveal, Button, Field, Label, Page, s, SectionHeading, StatusOption, useColors } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTaskStore } from '../../src/store/useTaskStore';
import { Attachment, Task, TaskInput } from '../../src/types';
import { localizeError, ru } from '../../src/localization/ru';
import { parseLocalDueAt } from '../../src/domain/tasks/taskDate';

const localInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const blank = (): TaskInput => ({ title: '', description: '', dueAt: localInput(new Date(Date.now() + 24 * 3600_000)), location: '', latitude: null, longitude: null, status: 'new' });

export default function TaskForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useTaskStore(state => state.tasks.find(task => task.id === id));
  return <TaskFormContent key={`${id ?? 'new'}:${existing ? 'present' : 'missing'}`} id={id} existing={existing} />;
}

function TaskFormContent({ id, existing }: { id?: string; existing: Task | undefined }) {
  const loading = useTaskStore(state => state.loading);
  const create = useTaskStore(state => state.create);
  const update = useTaskStore(state => state.update);
  const attachmentsForTask = useTaskStore(state => state.attachmentsForTask);
  const addMedia = useTaskStore(state => state.addMedia);
  const addDocuments = useTaskStore(state => state.addDocuments);
  const removeAttachment = useTaskStore(state => state.removeAttachment);
  const currentTaskCoordinates = useTaskStore(state => state.currentTaskCoordinates);
  const [form, setForm] = useState<TaskInput>(() => existing ? { ...existing, dueAt: localInput(new Date(existing.dueAt)) } : blank());
  const [latitudeText, setLatitudeText] = useState(() => existing?.latitude === null || existing?.latitude === undefined ? '' : String(existing.latitude));
  const [longitudeText, setLongitudeText] = useState(() => existing?.longitude === null || existing?.longitude === undefined ? '' : String(existing.longitude));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('');
  const [additionalExpanded, setAdditionalExpanded] = useState(Boolean(existing));
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 390 || fontScale > 1.25;
  const existingId = existing?.id;
  const existingLatitude = existing?.latitude;
  const existingLongitude = existing?.longitude;
  const datePart = form.dueAt.slice(0, 10);
  const timePart = form.dueAt.slice(11, 16);

  useEffect(() => {
    if (!id || loading || !existing) return;
    let active = true;
    void attachmentsForTask(existing.id).then(items => {
      if (active) setAttachments(items);
    }).catch(reason => {
      if (active) setError(localizeError(reason, ru.errors.loadAttachments));
    });
    return () => { active = false; };
  }, [id, loading, existing, attachmentsForTask]);

  useEffect(() => {
    if (loading || (id && !existingId) || (existingId && (existingLatitude !== null || existingLongitude !== null))) return;
    let active = true;
    void currentTaskCoordinates().then(coordinates => {
      if (!active) return;
      if (coordinates) {
        setLatitudeText(String(coordinates.latitude));
        setLongitudeText(String(coordinates.longitude));
        setForm(current => current.latitude === null && current.longitude === null ? { ...current, ...coordinates } : current);
      } else setLocationNotice(ru.form.locationOff);
    }).catch(() => {
      if (active) setLocationNotice(ru.form.locationFailed);
    });
    return () => { active = false; };
  }, [id, loading, existingId, existingLatitude, existingLongitude, currentTaskCoordinates]);

  function updateField(key: 'title' | 'description' | 'location', value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function updateDate(value: string) {
    setForm(current => ({ ...current, dueAt: `${value}T${current.dueAt.slice(11, 16)}` }));
  }

  function updateTime(value: string) {
    setForm(current => ({ ...current, dueAt: `${current.dueAt.slice(0, 10)}T${value}` }));
  }

  function parseCoordinate(value: string): number | null {
    const normalized = value.trim();
    if (!normalized) return null;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return Number.NaN;
    return Number(normalized);
  }

  async function save() {
    setError('');
    const input = { ...form, latitude: parseCoordinate(latitudeText), longitude: parseCoordinate(longitudeText) };
    try {
      const dueAt = parseLocalDueAt(input.dueAt);
      if (!dueAt) throw new Error('Enter a valid due date and time.');
      const taskInput = { ...input, dueAt };
      if (id) {
        await update(id, taskInput);
        router.replace(`/task/${id}`);
      } else {
        const createdId = await create(taskInput);
        router.replace(`/task/${createdId}`);
      }
    } catch (reason) {
      setError(localizeError(reason, ru.errors.saveTask));
    }
  }

  async function addAttachments(choose: typeof addMedia) {
    try {
      if (!id) {
        Alert.alert(ru.form.save, ru.form.savePhotoHint);
        return;
      }
      const selected = await choose(id);
      if (selected.length) setAttachments(current => [...current, ...selected]);
    } catch (reason) {
      setError(localizeError(reason, ru.errors.addAttachment));
    }
  }

  async function removePhoto(attachment: Attachment) {
    try {
      await removeAttachment(attachment);
      setAttachments(current => current.filter(item => item.id !== attachment.id));
    } catch (reason) {
      setError(localizeError(reason, ru.errors.removeAttachment));
    }
  }

  if (id && !loading && !existing) return <Page>
    <Text style={[s.title, { color: colors.text, marginBottom: 8 }]}>{ru.form.unavailable}</Text>
    <Text style={{ color: colors.danger, marginBottom: 12 }}>{ru.form.notAvailable}</Text>
    <Button title={ru.form.back} outlined onPress={() => router.replace('/(tabs)')} />
  </Page>;

  return <Page style={{ paddingTop: 4 }}>
    <Stack.Screen options={{ title: id ? ru.form.editTitle : ru.form.newTitle }} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
      <SectionHeading style={{ marginTop: 8 }}>{ru.form.task}</SectionHeading>
      <Label>{ru.form.title}</Label>
      <Field accessibilityLabel={ru.form.title} value={form.title} onChangeText={value => updateField('title', value)} placeholder={ru.form.titlePlaceholder} maxLength={100} />

      <Label>{ru.form.description}</Label>
      <Field accessibilityLabel={ru.form.description} value={form.description} onChangeText={value => updateField('description', value)} placeholder={ru.form.descriptionPlaceholder} multiline textAlignVertical="top" style={{ minHeight: 82, paddingTop: 12 }} />

      <SectionHeading>{ru.form.schedule}</SectionHeading>
      <Label>{ru.form.dateTime}</Label>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
        <View style={{ flex: 1.2 }}><Field accessibilityLabel={ru.form.dateTime} value={datePart} onChangeText={updateDate} placeholder={ru.form.datePlaceholder} autoCapitalize="none" /></View>
        <View style={{ flex: 0.8 }}><Field accessibilityLabel={ru.form.time} value={timePart} onChangeText={updateTime} placeholder="HH:mm" keyboardType="numbers-and-punctuation" /></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, marginTop: 8, borderRadius: 10, backgroundColor: colors.surfaceRaised }}>
        <Icon name="notifications-outline" color={colors.accent} size={16} />
        <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>{ru.form.reminder}</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{ru.settings.auto}</Text>
      </View>

      <SectionHeading>{ru.form.location}</SectionHeading>
      <Label>{ru.form.locationRequired}</Label>
      <Field accessibilityLabel={ru.form.locationRequired} value={form.location} onChangeText={value => updateField('location', value)} placeholder={ru.form.locationPlaceholder} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: additionalExpanded }}
        onPress={() => setAdditionalExpanded(value => !value)}
        android_ripple={{ color: colors.soft }}
        style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{ru.form.additional}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{id ? ru.form.coordinatesStatusAttachments : ru.form.coordinatesAndAttachments}</Text>
        </View>
        <Icon name={additionalExpanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={19} />
      </Pressable>

      {additionalExpanded ? <AnimatedReveal style={{ paddingBottom: 4 }}>
        <Label>{ru.form.coordinates}</Label>
        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Field accessibilityLabel={ru.form.latitude} value={latitudeText} onChangeText={setLatitudeText} placeholder={ru.form.latitude} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 1 }}><Field accessibilityLabel={ru.form.longitude} value={longitudeText} onChangeText={setLongitudeText} placeholder={ru.form.longitude} keyboardType="numbers-and-punctuation" /></View>
        </View>
        {locationNotice ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{locationNotice}</Text> : null}

        {id ? <>
          <Label>{ru.form.status}</Label>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {(['new', 'in_progress', 'completed', 'cancelled'] as const).map(status => <StatusOption key={status} status={status} selected={form.status === status} onPress={() => setForm(current => ({ ...current, status }))} />)}
          </View>
        </> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{ru.form.attachments(attachments.length)}</Text>
        </View>
        {!id ? <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>{ru.form.saveFirst}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {attachments.map(attachment => <Pressable key={attachment.id} accessibilityRole="button" accessibilityLabel={`${ru.form.remove}: ${attachment.fileName}`} onPress={() => void removePhoto(attachment)} style={{ width: 92, alignItems: 'center' }}>
            {attachment.type === 'image' ? <Image source={{ uri: attachment.localUri }} style={{ width: 76, height: 68, borderRadius: 9, backgroundColor: colors.surfaceRaised }} resizeMode="cover" /> : <View style={{ width: 76, height: 68, borderRadius: 9, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', padding: 5 }}><Icon name={attachment.type === 'video' ? 'videocam-outline' : 'document-outline'} color={colors.primary} size={22} /><Text numberOfLines={2} style={{ color: colors.text, fontSize: 9, textAlign: 'center', marginTop: 3 }}>{attachment.fileName}</Text></View>}
            <Text style={{ color: colors.danger, fontSize: 10, textAlign: 'center', marginTop: 2 }}>{ru.form.remove}</Text>
          </Pressable>)}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}><Button title={ru.form.addMedia} secondary onPress={() => void addAttachments(addMedia)} /></View>
          <View style={{ flex: 1 }}><Button title={ru.form.addFiles} outlined onPress={() => void addAttachments(addDocuments)} /></View>
        </View>
      </AnimatedReveal> : null}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    </ScrollView>
    <View style={{ paddingTop: 8, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
      <Button title={id ? ru.form.saveChanges : ru.form.create} onPress={() => void save()} />
    </View>
  </Page>;
}
