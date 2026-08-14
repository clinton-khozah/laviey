import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
export type AppearanceMode = 'web' | 'classic';
const KEY = '@lavey/appearance';
const Context = createContext<{ mode: AppearanceMode; ready: boolean; setMode(mode: AppearanceMode): Promise<void> } | null>(null);
export function AppearanceProvider({ children }: { children: ReactNode }) { const [mode, setValue] = useState<AppearanceMode>('web'); const [ready, setReady] = useState(false); useEffect(() => { void AsyncStorage.getItem(KEY).then((v) => { if (v === 'web' || v === 'classic') setValue(v); }).finally(() => setReady(true)); }, []); const value = useMemo(() => ({ mode, ready, setMode: async (next: AppearanceMode) => { setValue(next); await AsyncStorage.setItem(KEY, next); } }), [mode, ready]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useAppearance() { const value = useContext(Context); if (!value) throw new Error('useAppearance must be used inside AppearanceProvider'); return value; }
