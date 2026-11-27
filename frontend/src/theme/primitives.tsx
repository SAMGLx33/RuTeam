import type { ComponentPropsWithRef } from 'react';
import { Link as RouterLink } from 'expo-router';
import {
  ActivityIndicator as NativeActivityIndicator,
  Pressable as NativePressable,
  ScrollView as NativeScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View as NativeView,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView as NativeSafeAreaView } from 'react-native-safe-area-context';
import { useAppearance } from './appearance';
import { colors, night, typography } from './tokens';

const nightTokens = new Map<string, string>(
  Object.entries(colors).map(([name, color]) => [
    color,
    night[name as keyof typeof colors],
  ]),
);
const nightStyles = new WeakMap<object, object>();
function appearanceStyle<T extends TextStyle | ViewStyle>(
  style: StyleProp<T>,
  dark: boolean,
): StyleProp<T> {
  if (!dark || !style) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  const cached = nightStyles.get(flat);
  if (cached) return cached as T;
  let result = flat;
  for (const [name, value] of Object.entries(flat)) {
    const color =
      typeof value === 'string' && (name.endsWith('Color') || name === 'color')
        ? nightTokens.get(value)
        : undefined;
    if (color && color !== value) {
      if (result === flat) result = { ...flat };
      Object.assign(result, { [name]: color });
    }
  }
  nightStyles.set(flat, result);
  return result as T;
}

export function Text({
  style,
  ...props
}: ComponentPropsWithRef<typeof NativeText>) {
  const { dark, palette } = useAppearance();
  return (
    <NativeText
      {...props}
      style={[
        { color: palette.ink, fontFamily: typography.family },
        appearanceStyle(style, dark),
      ]}
    />
  );
}
export function TextInput({
  style,
  placeholderTextColor,
  ...props
}: ComponentPropsWithRef<typeof NativeTextInput>) {
  const { dark, palette } = useAppearance();
  return (
    <NativeTextInput
      {...props}
      placeholderTextColor={placeholderTextColor ?? palette.muted}
      selectionColor={palette.primary}
      style={[
        { color: palette.ink, fontFamily: typography.family },
        appearanceStyle(style, dark),
      ]}
    />
  );
}
export function View({
  style,
  ...props
}: ComponentPropsWithRef<typeof NativeView>) {
  const { dark } = useAppearance();
  return <NativeView {...props} style={appearanceStyle(style, dark)} />;
}
export function ScrollView({
  style,
  contentContainerStyle,
  ...props
}: ComponentPropsWithRef<typeof NativeScrollView>) {
  const { dark } = useAppearance();
  return (
    <NativeScrollView
      {...props}
      style={appearanceStyle(style, dark)}
      contentContainerStyle={appearanceStyle(contentContainerStyle, dark)}
    />
  );
}
export function SafeAreaView({
  style,
  ...props
}: ComponentPropsWithRef<typeof NativeSafeAreaView>) {
  const { dark } = useAppearance();
  return <NativeSafeAreaView {...props} style={appearanceStyle(style, dark)} />;
}
export function Pressable({
  style,
  ...props
}: ComponentPropsWithRef<typeof NativePressable>) {
  const { dark } = useAppearance();
  return (
    <NativePressable
      {...props}
      style={
        typeof style === 'function'
          ? (state) => appearanceStyle(style(state), dark)
          : appearanceStyle(style, dark)
      }
    />
  );
}
export function Link({
  style,
  ...props
}: ComponentPropsWithRef<typeof RouterLink>) {
  const { dark } = useAppearance();
  return <RouterLink {...props} style={appearanceStyle(style, dark)} />;
}
export function ActivityIndicator({
  color,
  ...props
}: ComponentPropsWithRef<typeof NativeActivityIndicator>) {
  const { dark, palette } = useAppearance();
  return (
    <NativeActivityIndicator
      {...props}
      color={
        color
          ? dark && typeof color === 'string'
            ? (nightTokens.get(color) ?? color)
            : color
          : palette.primary
      }
    />
  );
}
