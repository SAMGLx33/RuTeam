import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || pressed) && { opacity: 0.65 },
      ]}
    >
      <Text style={[styles.label, secondary && { color: colors.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 17,
    minHeight: 54,
    alignItems: 'center',
  },
  label: { color: '#fff', fontWeight: '700', fontSize: 17 },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
