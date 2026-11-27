import { Platform } from 'react-native';

export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  ink: '#10243a',
  muted: '#4f6278',
  primary: '#1465df',
  dark: '#0d2038',
  selected: '#eaf2ff',
  border: '#dce5ef',
  banner: '#fff3dc',
  bannerText: '#80520e',
  danger: '#b52430',
  success: '#08745f',
  turquoise: '#0f9c8e',
  onPrimary: '#fff',
  map: '#e8eff4',
} as const;

export type Palette = { [Key in keyof typeof colors]: string };
export const night: Palette = {
  background: '#0b1120',
  surface: '#141e30',
  ink: '#eaf2fb',
  muted: '#a8b8ce',
  primary: '#78afff',
  dark: '#eff5fc',
  selected: '#203758',
  border: '#2f4059',
  banner: '#372b1a',
  bannerText: '#f2cb85',
  danger: '#ff9ca7',
  success: '#6ce0c4',
  turquoise: '#51d6c7',
  onPrimary: '#fff',
  map: '#19283c',
};

export const filledPrimary = '#125fda';
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radii = { control: 12, panel: 16, sheet: 22, round: 999 };
export const breakpoints = { sidebar: 900, columns: 1100 };
export const typography = {
  family: Platform.select({
    web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: undefined,
  }),
  body: 15,
  caption: 13,
  section: 20,
  title: 32,
};
