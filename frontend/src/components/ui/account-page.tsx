import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

export function AccountPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.frame, wide && styles.wideFrame]}>
          <View style={[styles.brand, wide && styles.wideBrand]}>
            <Text style={styles.brandName}>RuTeam</Text>
            <Text style={styles.brandDescription}>
              Viajes compartidos para estudiantes USC
            </Text>
          </View>
          <View style={[styles.form, wide && styles.wideForm]}>
            <Text role="heading" aria-level={1} style={styles.title}>
              {title}
            </Text>
            {children}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export const accountStyles = StyleSheet.create({
  text: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  error: { color: colors.danger, fontSize: 15, lineHeight: 22 },
  link: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
    paddingVertical: 11,
  },
  label: { fontSize: 15, fontWeight: '700', color: colors.ink },
  input: {
    minHeight: 49,
    padding: 12,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  field: { gap: 6 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 18,
  },
});
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  frame: {
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  wideFrame: { flexDirection: 'row', minHeight: 530 },
  brand: {
    backgroundColor: colors.dark,
    padding: 26,
    gap: 12,
    justifyContent: 'center',
  },
  wideBrand: { width: '42%', padding: 36 },
  brandName: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  brandDescription: {
    color: '#c9e6d7',
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 250,
  },
  form: { flex: 1, padding: 22, gap: 16, justifyContent: 'center' },
  wideForm: { padding: 44 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: colors.ink,
  },
});
