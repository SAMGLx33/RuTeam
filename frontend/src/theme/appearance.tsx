import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { colors, night, type Palette } from './tokens';
import { readPreference, writePreference } from './appearance-storage';

export type AppearancePreference = 'system' | 'light' | 'dark';
interface AppearanceValue {
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => void;
  palette: Palette;
  dark: boolean;
  reducedMotion: boolean;
}
const AppearanceContext = createContext<AppearanceValue>({
  preference: 'system',
  setPreference: () => undefined,
  palette: colors,
  dark: false,
  reducedMotion: false,
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, changePreference] =
    useState<AppearancePreference>('system');
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void readPreference()
      .then((value) => {
        if (
          active &&
          (value === 'light' || value === 'dark' || value === 'system')
        )
          changePreference(value);
      })
      .catch(() => undefined);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReducedMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const dark =
    preference === 'dark' || (preference === 'system' && system === 'dark');
  return (
    <AppearanceContext.Provider
      value={{
        preference,
        dark,
        reducedMotion,
        palette: dark ? night : colors,
        setPreference: (value) => {
          changePreference(value);
          void writePreference(value).catch(() => undefined);
        },
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
