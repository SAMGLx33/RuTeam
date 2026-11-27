import { Text, TextInput, View } from '../../theme/primitives';
import { StyleSheet } from 'react-native';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { colors } from '../../theme/tokens';
export function Field<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            value={String(field.value ?? '')}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            style={styles.input}
          />
        </View>
      )}
    />
  );
}
const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 16, fontWeight: '600', color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 13,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
  },
});
