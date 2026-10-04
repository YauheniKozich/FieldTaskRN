import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useTaskStore } from '../store/useTaskStore';

const lightColors = {
  bg: '#F5F7FB', card: '#FFFFFF', text: '#101828', muted: '#65758B', line: '#D8E0EC',
  primary: '#245DF5', onPrimary: '#FFFFFF', soft: '#E8EFFF', onSoft: '#244793',
  accent: '#F2A93B', onAccent: '#382300',
  danger: '#BA1A1A', onDanger: '#FFFFFF', dangerSoft: '#FCE8E5', onDangerSoft: '#601410',
  warning: '#A76700', warningSoft: '#FFF1D8', onWarningSoft: '#694200',
  success: '#197348', successSoft: '#DCF5E8', onSuccessSoft: '#135334',
  surfaceRaised: '#FFFFFF',
};
const darkColors = {
  bg: '#0B131B', card: '#121E2B', text: '#F1F5FA', muted: '#A5B4C6', line: '#2A3A4C',
  primary: '#4D7CFF', onPrimary: '#FFFFFF', soft: '#1C2D45', onSoft: '#BDD0FF',
  accent: '#FFB94D', onAccent: '#382300',
  danger: '#FF8D87', onDanger: '#3E0908', dangerSoft: '#48201F', onDangerSoft: '#FFDAD7',
  warning: '#FFC66D', warningSoft: '#3E2D17', onWarningSoft: '#FFDFAB',
  success: '#55D49A', successSoft: '#153A2C', onSuccessSoft: '#9AE8BD',
  surfaceRaised: '#172535',
};
type ThemeColors = typeof lightColors;

const ThemeColorsContext = createContext<ThemeColors>(lightColors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTaskStore(state => state.theme);
  const systemTheme = useColorScheme();
  const colors = useMemo(() => theme === 'dark' || (theme === 'system' && systemTheme === 'dark') ? darkColors : lightColors, [theme, systemTheme]);

  return <ThemeColorsContext.Provider value={colors}>{children}</ThemeColorsContext.Provider>;
}

export function useThemeColors() {
  return useContext(ThemeColorsContext);
}
