import { Text, TextInput, View } from '../../theme/primitives';
import { StyleSheet } from 'react-native';
import {
  Controller,
  type Control,
  type ControllerProps,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { colors } from '../../theme/tokens';
export function Field<T extends FieldValues>({
  control,
  name,
  label,
  rules,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  rules?: ControllerProps<T>['rules'];
}) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            value={String(field.value ?? '')}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            style={styles.input}
          />
          {fieldState.error?.message && (
            <Text accessibilityRole="alert" style={styles.error}>
              {fieldState.error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}
const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 16, fontWeight: '600', color: colors.ink },
  error: { color: colors.danger, fontSize: 14 },
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
