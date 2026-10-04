import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Button, Muted, Page, ScreenHeader, StatusChip, useColors } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTaskStore } from '../../src/store/useTaskStore';
import { Task } from '../../src/types';
import { mapHtml, MapTask } from '../../src/features/map/mapHtml';
import { ru } from '../../src/localization/ru';

type MapMessage = 'map_ready' | 'map_error' | 'tile_error' | 'tile_loaded' | string;
type MapState = 'loading' | 'ready' | 'tile_error' | 'error';

function isMappable(task: Task): task is MapTask {
  return typeof task.latitude === 'number' && Number.isFinite(task.latitude) && Math.abs(task.latitude) <= 90 &&
    typeof task.longitude === 'number' && Number.isFinite(task.longitude) && Math.abs(task.longitude) <= 180;
}

export default function MapScreen() {
  const allTasks = useTaskStore(state => state.tasks);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [mapStatus, setMapStatus] = useState<{ source: { html: string; baseUrl: string } | null; status: MapState }>({ source: null, status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappedTasks = useMemo(() => allTasks.filter(isMappable)
    .filter(task => !openOnly || task.status === 'new' || task.status === 'in_progress')
    .filter(task => !query.trim() || `${task.title} ${task.location}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [allTasks, openOnly, query]);
  const selectedTask = mappedTasks.find(task => task.id === selectedId) ?? null;
  const source = useMemo(() => mappedTasks.length ? { html: mapHtml(mappedTasks), baseUrl: 'https://tile.openstreetmap.de/' } : null, [mappedTasks]);
  const mapState = mapStatus.source === source ? mapStatus.status : 'loading';

  function updateMapState(status: MapState) {
    setMapStatus({ source, status });
  }

  function handleMessage(message: MapMessage) {
    if (message === 'map_ready') updateMapState('ready');
    else if (message === 'tile_error') updateMapState('tile_error');
    else if (message === 'tile_loaded') updateMapState('ready');
    else if (message === 'map_error') updateMapState('error');
    else if (message.startsWith('select:')) setSelectedId(message.slice(7));
    else if (message.startsWith('open:')) router.push(`/task/${encodeURIComponent(message.slice(5))}`);
  }

  if (!allTasks.some(isMappable)) return <Page safeArea style={{ paddingTop: 8 }}>
    <ScreenHeader title={ru.tabs.map} subtitle={ru.map.subtitle(0)} />
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <Icon name="location-outline" color={colors.primary} size={36} />
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 5 }}>{ru.map.noTasks}</Text>
      <Muted>{ru.map.addCoordinates}</Muted>
      <View style={{ width: '100%', marginTop: 16 }}><Button title={ru.common.createTask} onPress={() => router.push('/task/new')} /></View>
    </View>
  </Page>;

  return <Page safeArea style={{ padding: 0 }}>
    {source ? <WebView
      key={`${reloadKey}-${mappedTasks.map(task => task.id).join(',')}`}
      style={{ flex: 1 }}
      originWhitelist={['https://tile.openstreetmap.de', 'about:blank']}
      javaScriptEnabled
      
      source={source}
      onMessage={event => handleMessage(event.nativeEvent.data)}
      onError={() => updateMapState('error')}
      onHttpError={() => updateMapState('error')}
      accessibilityLabel={ru.tabs.map}
    /> : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Muted>{ru.map.noMatches}</Muted><Pressable onPress={() => { setQuery(''); setOpenOnly(false); }} style={{ padding: 12 }}><Text style={{ color: colors.primary, fontWeight: '600' }}>{ru.tasks.resetFilters}</Text></Pressable></View>}

    <View style={{ position: 'absolute', top: insets.top + 10, left: 14, right: 14 }}>
      <View style={{ backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 8, elevation: 3 }}>
        <ScreenHeader title={ru.tabs.map} subtitle={ru.map.subtitle(mappedTasks.length)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 13, elevation: 3 }}>
        <Icon name="search-outline" color={colors.muted} size={19} />
        <TextInput accessibilityLabel={ru.map.search} value={query} onChangeText={value => { setQuery(value); setSelectedId(null); }} placeholder={ru.map.search} placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: openOnly }} accessibilityLabel={ru.map.openOnly} hitSlop={4} onPress={() => { setOpenOnly(value => !value); setSelectedId(null); }} android_ripple={{ color: colors.soft }} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: openOnly ? colors.primary : colors.card, borderWidth: 1, borderColor: openOnly ? colors.primary : colors.line, elevation: 3, overflow: 'hidden' }}>
        <Icon name="options-outline" color={openOnly ? colors.onPrimary : colors.text} size={19} />
      </Pressable>
      </View>
    </View>

    {source && mapState === 'loading' ? <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 170, left: 14, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, elevation: 2 }}><Text style={{ color: colors.text, fontSize: 12 }}>{ru.map.loading}</Text></View> : null}
    {mapState === 'error' || mapState === 'tile_error' ? <View style={{ position: 'absolute', top: insets.top + 168, left: 14, right: 14, padding: 13, borderRadius: 13, backgroundColor: colors.card, elevation: 4 }}>
      <Text style={{ color: colors.danger, fontSize: 12 }}>{mapState === 'tile_error' ? ru.map.tileError : ru.map.error}</Text>
      <Pressable accessibilityRole="button" onPress={() => { updateMapState('loading'); setReloadKey(value => value + 1); }} style={{ paddingTop: 9 }}><Text style={{ color: colors.primary, fontWeight: '600' }}>{ru.common.retry}</Text></Pressable>
    </View> : null}

    {selectedTask ? <View style={{ position: 'absolute', left: 14, right: 14, bottom: 12, padding: 14, borderRadius: 16, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, elevation: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{selectedTask.title}</Text>
        <StatusChip status={selectedTask.status} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}><Icon name="time-outline" size={13} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(selectedTask.dueAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}><Icon name="location-outline" size={13} color={colors.muted} /><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, flex: 1 }}>{selectedTask.location}</Text></View>
      <View style={{ marginTop: 8 }}><Button title={ru.map.viewTask} onPress={() => router.push(`/task/${selectedTask.id}`)} /></View>
    </View> : null}
  </Page>;
}
