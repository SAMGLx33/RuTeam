import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useAppearance } from '../../theme/appearance';
import { filledPrimary, radii } from '../../theme/tokens';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from '../../theme/primitives';
import { Icon, type IconName } from './icon';

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  loading = false,
  icon,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  loading?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const { palette } = useAppearance();
  const [focus, setFocus] = useState(false);
  const inactive = disabled || loading;
  const ink = secondary ? palette.primary : palette.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: focus
            ? palette.primary
            : secondary
              ? palette.border
              : filledPrimary,
          backgroundColor: secondary ? palette.surface : filledPrimary,
          opacity: inactive ? 0.48 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={ink} size="small" />
        ) : (
          icon && <Icon name={icon} size={17} color={ink} />
        )}
        <Text style={[styles.label, { color: ink }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function IconButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { palette } = useAppearance();
  const [focus, setFocus] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={({ pressed }) => [
        styles.icon,
        {
          backgroundColor: pressed ? palette.selected : palette.surface,
          borderColor: focus ? palette.primary : palette.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Icon name={icon} size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: radii.control,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    flexShrink: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
