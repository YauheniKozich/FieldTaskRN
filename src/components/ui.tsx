import React, { useEffect } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeProvider';
import { SyncStatus, TaskStatus } from '../types';
import { ru } from '../localization/ru';

export function useColors() {
  return useThemeColors();
}

export function Page({ children, style, safeArea = false }: { children: React.ReactNode; style?: ViewStyle; safeArea?: boolean }) {
  const colors = useColors();
  const pageStyle = [s.page, { backgroundColor: colors.bg }, style];
  return safeArea
    ? <SafeAreaView edges={['top']} style={pageStyle}>{children}</SafeAreaView>
    : <View style={pageStyle}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text accessibilityRole="text" style={[s.label, { color: colors.text }]}>{children}</Text>;
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  return <TextInput
    placeholderTextColor={colors.muted}
    selectionColor={colors.primary}
    underlineColorAndroid="transparent"
    {...props}
    accessibilityLabel={props.accessibilityLabel ?? (typeof props.placeholder === 'string' ? props.placeholder : undefined)}
    style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.line }, props.style]}
  />;
}

export function Button({ title, onPress, secondary, danger, outlined }: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  outlined?: boolean;
}) {
  const colors = useColors();
  const backgroundColor = danger ? (secondary ? colors.dangerSoft : colors.danger) : secondary ? colors.soft : outlined ? 'transparent' : colors.primary;
  const textColor = danger ? (secondary ? colors.onDangerSoft : colors.onDanger) : secondary ? colors.onSoft : outlined ? colors.primary : colors.onPrimary;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    hitSlop={6}
    android_ripple={{ color: danger ? colors.dangerSoft : colors.soft }}
    onPress={onPress}
    style={({ pressed }) => [
      s.button,
      { backgroundColor, borderColor: outlined ? colors.line : 'transparent', borderWidth: outlined ? 1 : 0, opacity: pressed ? 0.88 : 1 },
    ]}
  >
    <Text style={[s.buttonText, { color: textColor }]}>{title}</Text>
  </Pressable>;
}

export function Card({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const colors = useColors();
  const cardStyle = [s.card, { backgroundColor: colors.card, borderColor: colors.line }, style];
  return onPress
    ? <Pressable accessibilityRole="button" android_ripple={{ color: colors.soft }} onPress={onPress} style={cardStyle}>{children}</Pressable>
    : <View style={cardStyle}>{children}</View>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{children}</Text>;
}

export function ScreenHeader({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  const colors = useColors();
  return <View style={{ marginBottom: 16 }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 25, fontWeight: '700', lineHeight: 32 }}>{title}</Text>
    <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
  </View>;
}

export function SectionHeading({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const colors = useColors();
  return <Text accessibilityRole="header" style={[{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 2 }, style]}>{children}</Text>;
}

export function AnimatedReveal({ children, style, duration = 180 }: { children: React.ReactNode; style?: ViewStyle; duration?: number }) {
  const [progress] = React.useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = React.useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }, () => { if (active) setReduceMotion(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [duration, progress, reduceMotion]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>
    {children}
  </Animated.View>;
}

export function StatusChip({ status }: { status: TaskStatus }) {
  const colors = useColors();
  const palette = status === 'completed'
    ? { backgroundColor: colors.successSoft, color: colors.onSuccessSoft }
    : status === 'cancelled'
      ? { backgroundColor: colors.dangerSoft, color: colors.onDangerSoft }
      : status === 'in_progress'
        ? { backgroundColor: colors.soft, color: colors.onSoft }
        : { backgroundColor: colors.surfaceRaised, color: colors.text };
  return <View accessible accessibilityRole="text" accessibilityLabel={ru.status[status]} style={[s.statusChip, { backgroundColor: palette.backgroundColor }]}>
    <Text style={{ color: palette.color, fontSize: 12, fontWeight: '600' }}>{ru.status[status]}</Text>
  </View>;
}

export function StatusOption({ status, selected, onPress }: { status: TaskStatus; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    onPress={onPress}
    android_ripple={{ color: colors.soft }}
    hitSlop={4}
    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.soft : 'transparent', overflow: 'hidden' }}
  >
    <Text style={{ color: selected ? colors.onSoft : colors.text, fontSize: 14, fontWeight: selected ? '600' : '500' }}>{ru.status[status]}</Text>
  </Pressable>;
}

export function SyncLabel({ status, compact = false }: { status: SyncStatus; compact?: boolean }) {
  const colors = useColors();
  const label = status === 'synced' ? ru.syncStatus.synced : status === 'failed' ? ru.syncStatus.failed : ru.syncStatus.pending;
  const tint = status === 'failed' ? colors.danger : status === 'synced' ? colors.success : colors.muted;
  return <View accessible accessibilityRole="text" accessibilityLabel={label} style={[s.syncLabel, compact && { gap: 4 }]}>
    <View style={[s.syncDot, { backgroundColor: tint }, compact && { width: 6, height: 6 }]} />
    <Text style={{ color: status === 'failed' ? colors.danger : colors.muted, fontSize: compact ? 10 : 12 }}>{label}</Text>
  </View>;
}

export const s = StyleSheet.create({
  page: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 48 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginVertical: 4, overflow: 'hidden' },
  buttonText: { fontWeight: '600', fontSize: 14, letterSpacing: 0.1 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10, overflow: 'hidden', elevation: 1 },
  statusChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  syncLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  section: { fontSize: 24, fontWeight: '600', lineHeight: 32, marginBottom: 16 },
  error: { color: '#BA1A1A', fontSize: 14, marginVertical: 8 },
});
