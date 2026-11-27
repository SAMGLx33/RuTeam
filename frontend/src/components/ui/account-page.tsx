import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, ScrollView, Text, View } from '../../theme/primitives';
import { colors, radii, spacing } from '../../theme/tokens';
import { Brand } from '../navigation/app-navigation';

export function AccountPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: boolean;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.frame, wide && styles.wideFrame]}>
            <View style={[styles.brand, wide && styles.wideBrand]}>
              <Brand />
              {intro && (
                <>
                  <Text style={styles.purpose}>Muévete con tu comunidad</Text>
                  <Text style={styles.description}>
                    Comparte y encuentra viajes programados con estudiantes de
                    la Universidad Santiago de Cali.
                  </Text>
                </>
              )}
            </View>
            <View style={[styles.form, wide && styles.wideForm]}>
              <Text role="heading" aria-level={1} style={styles.title}>
                {title}
              </Text>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const accountStyles = StyleSheet.create({
  text: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 15, lineHeight: 22 },
  link: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    paddingVertical: 9,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink },
  input: {
    minHeight: 49,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.control,
    color: colors.ink,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  field: { gap: 7 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 16,
  },
});
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  frame: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  wideFrame: {
    maxWidth: 960,
    flexDirection: 'row',
    minHeight: 545,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: {
    padding: spacing.xl,
    gap: 17,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  wideBrand: { width: '46%', padding: 42, backgroundColor: colors.selected },
  purpose: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -1.15,
    fontWeight: '900',
    maxWidth: 350,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 290,
  },
  form: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: 4,
    gap: 14,
    justifyContent: 'center',
  },
  wideForm: { padding: 44 },
  title: {
    color: colors.ink,
    fontSize: 25,
    letterSpacing: -0.5,
    fontWeight: '800',
  },
});
