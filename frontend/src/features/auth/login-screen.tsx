import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DemoLoginInput } from '@ruteam/contracts';
import { useSession } from '../../providers/session-provider';
import { Button } from '../../components/ui/button';
import { colors } from '../../theme/tokens';
const identities: { identity: DemoLoginInput['identity']; label: string }[] = [
  { identity: 'ana', label: 'Ana · Pasajera' },
  { identity: 'diego', label: 'Diego · Conductor' },
  { identity: 'laura', label: 'Laura · Inactiva' },
  { identity: 'admin', label: 'Administración · Demo' },
];
export function LoginScreen() {
  const { signIn } = useSession();
  const [identity, setIdentity] = useState<DemoLoginInput['identity']>('ana');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function login() {
    setError(null);
    setBusy(true);
    try {
      await signIn(identity);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No pudimos iniciar sesión',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.content}>
      <Text role="heading" aria-level={1} style={styles.title}>
        Tu comunidad. Un mismo destino.
      </Text>
      <Text style={styles.subtitle}>Comparte el camino hacia la USC.</Text>
      <View style={styles.form}>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {identities.map((item) => (
            <Pressable
              key={item.identity}
              accessibilityRole="radio"
              accessibilityState={{
                checked: item.identity === identity,
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => {
                setIdentity(item.identity);
                setError(null);
              }}
              style={[
                styles.row,
                item.identity === identity && {
                  backgroundColor: colors.selected,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 25,
                  color:
                    item.identity === identity ? colors.primary : colors.muted,
                }}
              >
                {item.identity === identity ? '◉' : '○'}
              </Text>
              <Text style={styles.identity}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Button
          title={busy ? 'Verificando vinculación…' : 'Entrar a la demo'}
          disabled={busy}
          onPress={() => {
            void login();
          }}
        />
        <Text style={styles.note}>
          En esta demostración sólo se utilizan identidades sintéticas para
          fines académicos. No se valida el QR institucional USC.
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { paddingTop: 34, gap: 18, alignItems: 'center' },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    maxWidth: 730,
  },
  subtitle: { fontSize: 21, color: colors.muted, textAlign: 'center' },
  form: { width: '100%', maxWidth: 530, gap: 23, marginTop: 18 },
  choices: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  identity: { fontSize: 18, fontWeight: '600', color: colors.ink },
  error: { color: colors.danger, fontSize: 16, lineHeight: 24 },
  note: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: colors.muted,
  },
});
