import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useTaskStore, observeConnectivity } from '../src/store/useTaskStore';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../src/theme/ThemeProvider';
export default function RootLayout(){const init=useTaskStore(s=>s.init);const theme=useTaskStore(s=>s.theme);const system=useColorScheme();const dark=theme==='dark'||(theme==='system'&&system==='dark');useEffect(()=>{void init();const sub=observeConnectivity();return()=>sub();},[init]);return <ThemeProvider><StatusBar style={dark?'light':'dark'}/><Stack screenOptions={{headerShown:false}}/></ThemeProvider>;}
