import { useState, type ReactNode } from 'react';
import { Link } from 'expo-router';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import {
  AccountPage,
  accountStyles as s,
} from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import type { UsagePreference } from '@ruteam/contracts';

export function AccountField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput {...props} accessibilityLabel={label} style={s.input} />
    </View>
  );
}

export function UsageChoices({
  value,
  onChange,
}: {
  value: UsagePreference;
  onChange: (value: UsagePreference) => void;
}) {
  const choices = [
    ['PASSENGER', 'Viajar como pasajero'],
    ['DRIVER_AND_PASSENGER', 'Conducir y viajar como pasajero'],
  ] as const;
  return choices.map(([key, title]) => (
    <Button
      key={key}
      title={title}
      secondary={key !== value}
      onPress={() => onChange(key)}
    />
  ));
}

export function useAccountAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No pudimos completar la operación.',
      );
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, error, run, setMessage };
}

export function AccountFeedback({
  error,
  children,
}: {
  error?: string | null;
  children?: ReactNode;
}) {
  return (
    <>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {children && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {children}
        </Text>
      )}
    </>
  );
}

export function LoginScreen() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAccountAction();
  return (
    <AccountPage title="Iniciar sesión">
      <AccountField
        label="Correo institucional"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="tu.correo@usc.edu.co"
        value={email}
        onChangeText={setEmail}
      />
      <AccountField
        label="Contraseña"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      <AccountFeedback error={action.error ?? session.error} />
      <Button
        title={action.busy ? 'Iniciando sesión…' : 'Iniciar sesión'}
        disabled={action.busy || !email.trim() || !password}
        onPress={() => {
          void action.run(() =>
            session.signIn({ email: email.trim(), password }),
          );
        }}
      />
      <View style={s.actions}>
        <Link href="/register" replace style={s.link}>
          Crear cuenta
        </Link>
        <Link href="/account-status" style={s.link}>
          Consultar o reactivar mi cuenta
        </Link>
        <Link href="/recover-access" style={s.link}>
          Recuperar acceso
        </Link>
      </View>
      <Text style={s.text}>
        Usa una contraseña propia de RuTeam. La matrícula vigente se verifica
        por separado.
      </Text>
      <Link href="/privacy" style={s.link}>
        Privacidad y condiciones de uso
      </Link>
    </AccountPage>
  );
}

export function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usagePreference, setUsage] = useState<UsagePreference>('PASSENGER');
  const action = useAccountAction();
  async function register() {
    const result = await api<{ emailDeliveryAvailable: boolean }>(
      '/auth/register',
      {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          usagePreference,
        },
      },
    );
    setPassword('');
    action.setMessage(
      result.emailDeliveryAvailable
        ? 'Si el correo puede recibir la verificación, encontrarás un enlace en tu bandeja. Puedes iniciar sesión para consultar tu cuenta.'
        : 'El envío de correo aún no está disponible. Inicia sesión para consultar el estado de tu cuenta.',
    );
  }
  return (
    <AccountPage title="Crear cuenta">
      <Text style={s.text}>
        Ingresa tu correo USC y elige una contraseña para RuTeam de al menos 12
        caracteres.
      </Text>
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
        value={email}
        onChangeText={setEmail}
      />
      <AccountField
        label="Contraseña nueva"
        autoComplete="new-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <UsageChoices value={usagePreference} onChange={setUsage} />
      <AccountFeedback error={action.error}>{action.message}</AccountFeedback>
      <Button
        title={action.busy ? 'Creando cuenta…' : 'Crear cuenta'}
        disabled={
          action.busy ||
          name.trim().length < 2 ||
          !email.includes('@') ||
          password.length < 12
        }
        onPress={() => {
          void action.run(register);
        }}
      />
      <Link href="/" replace style={s.link}>
        Volver a iniciar sesión
      </Link>
      <Link href="/privacy" style={s.link}>
        Privacidad y condiciones de uso
      </Link>
    </AccountPage>
  );
}
