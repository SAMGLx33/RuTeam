import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type {
  PasswordResetAuthorization,
  RecoveryContactInput,
  RecoveryContactStatus,
  RecoveryTiming,
} from '@ruteam/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  AccountPage,
  accountStyles as s,
} from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import { Link, Text, View } from '../../theme/primitives';
import { api, ApiError } from '../../services/api/client';
import {
  AccountFeedback,
  AccountField,
  useAccountAction,
} from './login-screen';
import { RecoverAccessScreen } from './account-screens';
import { useAccessConfiguration } from './access-configuration';
import {
  PhoneNumberField,
  isPossibleRecoveryPhone,
} from './phone-number-field';

const path = '/auth/recovery';
const localNotice =
  'En desarrollo, consulta el código en la consola del servidor. La confirmación es local y no verifica la titularidad por correo o SMS.';

export const emptyRecoveryContact: RecoveryContactInput = {
  channel: 'EMAIL',
  contact: '',
};

export function RecoveryContactFields({
  value,
  onChange,
  disabled,
}: {
  value: RecoveryContactInput;
  onChange: (value: RecoveryContactInput) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <Text style={s.label}>Medio de recuperación</Text>
      <Button
        title="Correo personal"
        secondary={value.channel !== 'EMAIL'}
        disabled={disabled}
        onPress={() => {
          if (value.channel !== 'EMAIL') onChange(emptyRecoveryContact);
        }}
      />
      <Button
        title="Teléfono"
        secondary={value.channel !== 'PHONE'}
        disabled={disabled}
        onPress={() => {
          if (value.channel !== 'PHONE')
            onChange({ channel: 'PHONE', contact: '+57' });
        }}
      />
      {value.channel === 'PHONE' ? (
        <PhoneNumberField
          value={value.contact}
          disabled={disabled}
          onChange={(contact) => onChange({ ...value, contact })}
        />
      ) : (
        <AccountField
          label="Dirección de correo personal"
          value={value.contact}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          onChangeText={(contact) => onChange({ ...value, contact })}
        />
      )}
    </>
  );
}

export function recoveryContactEntered(value: RecoveryContactInput) {
  return value.channel === 'EMAIL'
    ? value.contact.includes('@')
    : isPossibleRecoveryPhone(value.contact);
}

type CodeClock = { observedAt: number; expiresAt?: number; resendAt: number };

function startClock(timing: RecoveryTiming): CodeClock {
  const now = Date.now();
  return {
    observedAt: now,
    resendAt: now + timing.resendAfterSeconds * 1000,
  };
}

function CodeEntry({
  clock,
  busy,
  submit,
  resend,
  first = 'Reenviar código',
  publicRequest = false,
}: {
  clock?: CodeClock;
  busy: boolean;
  submit: (code: string) => void;
  resend: () => void;
  first?: string;
  publicRequest?: boolean;
}) {
  const [code, setCode] = useState('');
  const [now, setNow] = useState(Date.now);
  const expiresAt = clock?.expiresAt;
  const resendAt = clock?.resendAt;
  useEffect(() => {
    if (expiresAt === undefined && resendAt === undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, resendAt]);
  const observedNow = Math.max(now, clock?.observedAt ?? 0);
  const remaining =
    expiresAt === undefined
      ? undefined
      : Math.max(0, Math.ceil((expiresAt - observedNow) / 1000));
  const wait =
    resendAt === undefined
      ? 0
      : Math.max(0, Math.ceil((resendAt - observedNow) / 1000));
  return (
    <>
      <Text style={s.text}>{localNotice}</Text>
      <AccountField
        label="Código de seis dígitos"
        keyboardType="number-pad"
        autoComplete="off"
        editable={!busy}
        value={code}
        onChangeText={(input) => setCode(input.replace(/\D/g, '').slice(0, 6))}
      />
      {remaining !== undefined && (
        <Text style={s.text}>
          {remaining > 0
            ? `Tiempo restante: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
            : 'El código venció. Solicita uno nuevo.'}
        </Text>
      )}
      <Button
        title="Validar código"
        loading={busy}
        disabled={code.length !== 6 || (!publicRequest && !remaining) || busy}
        onPress={() => submit(code)}
      />
      <Button
        title={
          wait
            ? `Reenviar en ${wait > 60 ? `${Math.ceil(wait / 60)} min` : `${wait} s`}`
            : first
        }
        secondary
        disabled={!!wait || busy}
        onPress={resend}
      />
    </>
  );
}

export function RecoveryContactSettings({
  userId,
  registration,
  onContinue,
}: {
  userId: string;
  registration?: boolean;
  onContinue?: () => void;
}) {
  const access = useAccessConfiguration();
  const declared = access.data?.institutionalAccess === 'DECLARED_DOMAIN';
  const status = useQuery({
    queryKey: ['recovery-contact', userId],
    queryFn: () => api<RecoveryContactStatus>(path + '/contact'),
    enabled: declared,
    gcTime: 0,
  });
  const [editing, setEditing] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [contact, setContact] = useState(emptyRecoveryContact);
  const [password, setPassword] = useState('');
  const action = useAccountAction();

  if (!declared) return null;
  const current = status.data;
  const timing = current?.confirmationTiming;
  const observedAt = status.dataUpdatedAt;
  const serverTime = timing ? Date.parse(timing.serverTime) : 0;
  const clock = timing
    ? {
        observedAt,
        expiresAt: timing.expiresAt
          ? observedAt + Date.parse(timing.expiresAt) - serverTime
          : undefined,
        resendAt: observedAt + Date.parse(timing.resendAt) - serverTime,
      }
    : undefined;
  async function contactAction(call: () => Promise<void>) {
    try {
      await call();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 0)
          throw new Error(
            'No pudimos conectar con RuTeam. Comprueba tu conexión y vuelve a intentarlo.',
          );
        if (error.status === 429 || error.code === 'OTP_UNAVAILABLE')
          await status.refetch();
      }
      throw error;
    }
  }
  async function configure() {
    await api(path + '/contact', {
      method: 'PUT',
      body: { ...contact, password },
    });
    setEditing(false);
    setPassword('');
    setContact(emptyRecoveryContact);
    await status.refetch();
    action.setMessage(
      'Medio guardado. Confírmalo para usarlo al recuperar tu contraseña.',
    );
  }
  async function resend() {
    await api(path + '/contact/request', { method: 'POST' });
    await status.refetch();
    action.setMessage(
      'Código de confirmación emitido. Consulta la consola del servidor.',
    );
  }
  async function confirm(code: string) {
    await api(path + '/contact/confirm', { method: 'POST', body: { code } });
    await status.refetch();
    action.setMessage('Medio confirmado mediante transporte local.');
  }

  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={s.label}>
        Medio de recuperación
      </Text>
      {status.isPending && (
        <Text style={s.text}>Consultando tu medio de recuperación…</Text>
      )}
      {current && (
        <>
          <Text style={s.text}>
            {current.confirmed
              ? `${current.confirmed.masked} · Confirmación local por consola`
              : 'Aún no tienes un medio confirmado.'}
          </Text>
          {current.pending && (
            <Text style={s.text}>
              Pendiente de confirmación · {current.pending.masked}
            </Text>
          )}
          {registration &&
          current.confirmed &&
          !current.pending ? null : editing ? (
            <>
              <RecoveryContactFields
                value={contact}
                onChange={setContact}
                disabled={action.busy}
              />
              <AccountField
                label="Contraseña actual"
                autoComplete="current-password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!action.busy}
              />
              <Button
                title="Guardar medio de recuperación"
                loading={action.busy}
                disabled={
                  !recoveryContactEntered(contact) || password.length < 12
                }
                onPress={() => void action.run(configure)}
              />
              <Button
                title="Cancelar edición"
                secondary
                disabled={action.busy}
                onPress={() => {
                  setEditing(false);
                  setPassword('');
                  setContact(emptyRecoveryContact);
                }}
              />
            </>
          ) : (
            <Button
              title={
                current.confirmed || current.pending
                  ? 'Cambiar medio de recuperación'
                  : 'Configurar medio de recuperación'
              }
              secondary
              disabled={action.busy}
              onPress={() => setEditing(true)}
            />
          )}
          {!editing &&
            current.pending &&
            (current.localDelivery ? (
              <CodeEntry
                key={timing?.expiresAt ?? 'pending'}
                clock={clock}
                busy={action.busy}
                first={
                  timing?.expiresAt
                    ? undefined
                    : 'Solicitar código de confirmación'
                }
                resend={() => void action.run(() => contactAction(resend))}
                submit={(code) =>
                  void action.run(() => contactAction(() => confirm(code)))
                }
              />
            ) : (
              <Text style={s.text}>
                El transporte OTP de desarrollo está deshabilitado.
              </Text>
            ))}
        </>
      )}
      {registration &&
        current &&
        (current.confirmed && !current.pending ? (
          <Button
            title="Continuar al onboarding"
            onPress={() => onContinue?.()}
          />
        ) : confirmSkip ? (
          <>
            <Text accessibilityRole="alert" style={s.text}>
              Todavía no has confirmado tu medio de recuperación. Podrás hacerlo
              desde tu perfil, pero no podrás recuperar tu contraseña hasta
              completarlo.
            </Text>
            <Button
              title="Continuar sin confirmar"
              onPress={() => onContinue?.()}
            />
            <Button
              title="Volver a la confirmación"
              secondary
              onPress={() => setConfirmSkip(false)}
            />
          </>
        ) : (
          <Button
            title="Omitir por ahora"
            secondary
            disabled={action.busy}
            onPress={() => setConfirmSkip(true)}
          />
        ))}
      <AccountFeedback error={action.error ?? status.error?.message}>
        {action.message}
      </AccountFeedback>
    </View>
  );
}

function OtpAccessScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [clock, setClock] = useState<ReturnType<typeof startClock>>();
  const [grant, setGrant] = useState<string>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [complete, setComplete] = useState(false);
  const action = useAccountAction();
  const availability = useQuery({
    queryKey: ['recovery-availability'],
    queryFn: () => api<{ localDelivery: boolean }>(path + '/availability'),
  });

  async function request() {
    const response = await api<RecoveryTiming & { message: string }>(
      path + '/request',
      {
        method: 'POST',
        body: { email: email.trim() },
      },
    );
    setClock(startClock(response));
    action.setMessage(response.message);
  }
  async function verify(code: string) {
    const { token } = await api<PasswordResetAuthorization>(path + '/verify', {
      method: 'POST',
      body: { email: email.trim(), code },
    });
    setGrant(token);
  }
  async function reset() {
    await api(path + '/reset', {
      method: 'POST',
      body: { token: grant, password },
    });
    setGrant(undefined);
    setPassword('');
    setConfirmation('');
    setComplete(true);
  }
  return (
    <AccountPage title="Recuperar acceso">
      {complete ? (
        <>
          <Text accessibilityRole="alert" style={s.text}>
            Contraseña actualizada. Las sesiones anteriores se cerraron.
          </Text>
          <Button
            title="Ir a iniciar sesión"
            onPress={() => router.replace('/')}
          />
        </>
      ) : grant ? (
        <>
          <Text style={s.text}>
            Elige una nueva contraseña de 12 a 128 caracteres.
          </Text>
          <AccountField
            label="Contraseña nueva"
            autoComplete="new-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!action.busy}
          />
          <AccountField
            label="Confirmar contraseña nueva"
            autoComplete="new-password"
            secureTextEntry
            value={confirmation}
            onChangeText={setConfirmation}
            editable={!action.busy}
          />
          {!!confirmation && password !== confirmation && (
            <Text style={s.error}>Las contraseñas deben coincidir.</Text>
          )}
          <Button
            title="Guardar contraseña"
            loading={action.busy}
            disabled={
              password.length < 12 ||
              password.length > 128 ||
              password !== confirmation
            }
            onPress={() => void action.run(reset)}
          />
          <Button
            title="Volver a solicitar un código"
            secondary
            disabled={action.busy}
            onPress={() => {
              setGrant(undefined);
              setClock(undefined);
              setPassword('');
              setConfirmation('');
              action.setMessage(null);
            }}
          />
        </>
      ) : clock ? (
        <>
          <Text style={s.text}>
            Recibimos la solicitud. Esto no confirma un envío. Si apareció un
            código, introdúcelo aquí. Si omitiste la confirmación, inicia sesión
            y completa el paso desde tu perfil.
          </Text>
          <CodeEntry
            key={clock.observedAt}
            publicRequest
            clock={clock}
            busy={action.busy}
            resend={() => void action.run(request)}
            submit={(code) => void action.run(() => verify(code))}
          />
        </>
      ) : (
        <>
          <AccountField
            label="Correo institucional"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!action.busy}
          />
          {availability.data?.localDelivery === false && (
            <Text style={s.text}>
              El transporte OTP de desarrollo está deshabilitado.
            </Text>
          )}
          <Button
            title="Solicitar código"
            loading={action.busy}
            disabled={
              !availability.data?.localDelivery ||
              !email.trim().toLowerCase().endsWith('@usc.edu.co')
            }
            onPress={() => void action.run(request)}
          />
        </>
      )}
      <AccountFeedback error={action.error ?? availability.error?.message}>
        {action.message}
      </AccountFeedback>
      {!complete && (
        <Link href="/" replace style={s.link}>
          Volver a iniciar sesión
        </Link>
      )}
    </AccountPage>
  );
}

export function RecoveryAccessRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const access = useAccessConfiguration(!token);
  if (token || access.data?.institutionalAccess === 'OFFICIAL')
    return <RecoverAccessScreen />;
  if (access.data?.institutionalAccess === 'DECLARED_DOMAIN')
    return <OtpAccessScreen />;
  return (
    <AccountPage title="Recuperar acceso">
      <AccountFeedback error={access.error?.message}>
        {access.isPending ? 'Consultando opciones de recuperación…' : null}
      </AccountFeedback>
      <Link href="/" replace style={s.link}>
        Volver a iniciar sesión
      </Link>
    </AccountPage>
  );
}
