import { useState, type KeyboardEvent } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { RegistrationReceipt, UsagePreference } from '@ruteam/contracts';
import {
  AccountPage,
  accountStyles as s,
} from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { api } from '../../services/api/client';
import { Link, Pressable, Text, View } from '../../theme/primitives';
import { colors, radii } from '../../theme/tokens';
import { useAccessConfiguration } from './access-configuration';
import {
  AccountFeedback,
  AccountField,
  UsageChoices,
  useAccountAction,
} from './login-screen';

function isInstitutionalEmail(email: string) {
  const [local, domain, extra] = email.trim().toLowerCase().split('@');
  const atom = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+$/;
  return (
    local.length > 0 &&
    local.length <= 64 &&
    extra === undefined &&
    domain === 'usc.edu.co' &&
    local.split('.').every((part) => atom.test(part))
  );
}

export function RegisterScreen() {
  const access = useAccessConfiguration();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usagePreference, setUsage] = useState<UsagePreference>('PASSENGER');
  const [agreed, setAgreed] = useState(false);
  const [termsFocused, setTermsFocused] = useState(false);
  const action = useAccountAction();

  const institutionalEmail = isInstitutionalEmail(email);
  const validPassword = password.length >= 12 && password.length <= 128;
  const declared = access.data?.institutionalAccess === 'DECLARED_DOMAIN';
  const toggleTerms = () => setAgreed((value) => !value);
  const keyboard =
    Platform.OS === 'web'
      ? {
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.key !== ' ') return;
            event.preventDefault();
            if (!event.repeat) toggleTerms();
          },
        }
      : undefined;
  async function register() {
    const result = await api<RegistrationReceipt>('/auth/register', {
      method: 'POST',
      body: {
        name: name.trim(),
        email: email.trim(),
        password,
        usagePreference,
      },
    });
    setPassword('');
    action.setMessage(
      result.institutionalAccess === 'DECLARED_DOMAIN'
        ? 'Ya puedes iniciar sesión. Si ya tenías una cuenta, usa tu contraseña habitual de RuTeam.'
        : result.emailDeliveryAvailable
          ? 'Si el correo puede recibir la verificación, encontrarás un enlace en tu bandeja.'
          : 'La confirmación por correo está temporalmente indisponible en esta instalación.',
    );
  }

  return (
    <AccountPage title="Crear cuenta">
      <Text style={s.text}>
        Regístrate con una dirección de correo terminada en @usc.edu.co.
      </Text>
      {declared && (
        <Text style={s.text}>
          Esta versión admite el correo declarado. La titularidad del correo y
          la matrícula universitaria no se comprueban al registrarte.
        </Text>
      )}
      <AccountField
        label="Nombre"
        autoComplete="name"
        value={name}
        onChangeText={setName}
      />
      <AccountField
        label="Correo institucional"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="tu.correo@usc.edu.co"
        value={email}
        onChangeText={setEmail}
      />
      {!!email.trim() && !institutionalEmail && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          Escribe un correo válido con el dominio exacto @usc.edu.co.
        </Text>
      )}
      <AccountField
        label="Contraseña nueva"
        autoComplete="new-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Text style={s.text}>Usa entre 12 y 128 caracteres.</Text>
      <Text style={s.label}>Preferencia de movilidad</Text>
      <UsageChoices value={usagePreference} onChange={setUsage} />
      <View style={styles.termsGroup}>
        <Link href="/privacy" style={s.link}>
          Leer las condiciones de uso y privacidad
        </Link>
        <Pressable
          {...keyboard}
          accessibilityRole="checkbox"
          accessibilityLabel="Acepto las condiciones de uso"
          accessibilityState={{ checked: agreed }}
          aria-checked={agreed}
          onPress={toggleTerms}
          onFocus={() => setTermsFocused(true)}
          onBlur={() => setTermsFocused(false)}
          style={[
            styles.terms,
            agreed && styles.termsSelected,
            termsFocused && styles.termsFocus,
          ]}
        >
          <View aria-hidden style={styles.checkbox}>
            {agreed && <Icon name="check" size={17} />}
          </View>
          <Text style={styles.termsLabel}>Acepto las condiciones de uso</Text>
        </Pressable>
      </View>
      <AccountFeedback error={action.error}>{action.message}</AccountFeedback>
      <Button
        title={action.busy ? 'Creando cuenta…' : 'Crear cuenta'}
        loading={action.busy}
        disabled={
          name.trim().length < 2 ||
          !institutionalEmail ||
          !validPassword ||
          !agreed
        }
        onPress={() => {
          void action.run(register);
        }}
      />
      <Link href="/" replace style={s.link}>
        Volver a iniciar sesión
      </Link>
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  termsGroup: { gap: 3 },
  terms: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
  },
  termsSelected: { backgroundColor: colors.selected },
  termsFocus: { borderColor: colors.primary },
  termsLabel: { flexShrink: 1, color: colors.ink, fontSize: 14 },
  checkbox: {
    minWidth: 23,
    minHeight: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 5,
  },
});
