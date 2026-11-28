import { ActivityIndicator, Link, Text, View } from '../../theme/primitives';
import { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import type {
  StudentEligibilityStatus,
  UsagePreference,
} from '@ruteam/contracts';
import {
  AccountPage,
  accountStyles as s,
} from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { useAccessConfiguration } from './access-configuration';
import {
  AccountFeedback,
  AccountField,
  UsageChoices,
  useAccountAction,
} from './login-screen';

export const eligibilityLabels: Record<StudentEligibilityStatus, string> = {
  PENDING_VERIFICATION: 'Verificación estudiantil pendiente',
  VERIFIED_CURRENT: 'Estudiante vigente',
  DECLARED: 'Acceso por dominio USC declarado',
  INELIGIBLE: 'Vinculación no elegible',
  EXPIRED: 'Vigencia vencida',
  REVOKED: 'Verificación revocada',
};

export function VerificationScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const session = useSession();
  const action = useAccountAction();
  const { user } = session;
  const [password, setPassword] = useState('');
  const access = useAccessConfiguration(!!user || !!token);
  const declared = access.data?.institutionalAccess === 'DECLARED_DOMAIN';

  if (session.loading && !token)
    return <ActivityIndicator accessibilityLabel="Consultando sesión" />;
  if (!token && !user) return <Redirect href="/" />;
  if (!token && user?.capabilities.passenger) return <Redirect href="/" />;
  if (token && (access.isPending || access.isError || declared))
    return (
      <AccountPage title="Confirmación de correo">
        {access.isPending && (
          <ActivityIndicator accessibilityLabel="Consultando el acceso" />
        )}
        <AccountFeedback error={access.error?.message} />
        {declared && (
          <Text style={s.text}>
            Esta instalación admite el dominio declarado. Para acceder usa la
            contraseña que elegiste en RuTeam.
          </Text>
        )}
        <Link href="/" style={s.link}>
          Volver a iniciar sesión
        </Link>
      </AccountPage>
    );

  return (
    <AccountPage
      title={
        token
          ? 'Confirma tu correo'
          : eligibilityLabels[
              user?.eligibility.status ?? 'PENDING_VERIFICATION'
            ]
      }
    >
      {token ? (
        <>
          <Text style={s.text}>
            Elige la contraseña que usarás para iniciar sesión en RuTeam.
          </Text>
          <AccountField
            label="Contraseña nueva"
            autoComplete="new-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button
            title="Confirmar correo"
            disabled={action.busy || !!action.message || password.length < 12}
            onPress={() => {
              void action.run(async () => {
                await api('/auth/email/confirm', {
                  method: 'POST',
                  body: { token, password },
                });
                setPassword('');
                await session.refresh();
                action.setMessage(
                  'Correo confirmado. Inicia sesión con tu contraseña nueva.',
                );
              });
            }}
          />
        </>
      ) : (
        <>
          <Text style={s.text}>{user?.email}</Text>
          {declared ? (
            <Text style={s.text}>
              El estado actual de tu cuenta restringe el acceso a los viajes.
              Consulta el estado o vuelve a iniciar sesión.
            </Text>
          ) : (
            <>
              <Text style={s.text}>
                {user?.emailVerified
                  ? 'Correo confirmado.'
                  : access.data?.accountEmailAvailable
                    ? 'Confirma el enlace que recibiste por correo.'
                    : 'La confirmación por correo está temporalmente indisponible.'}
              </Text>
              <Text style={s.text}>
                En esta instalación el acceso a viajes requiere acreditar la
                matrícula vigente.
              </Text>
              {!user?.emailVerified && access.data?.accountEmailAvailable && (
                <Button
                  title="Reenviar correo"
                  disabled={action.busy}
                  onPress={() => {
                    void action.run(async () => {
                      await api('/auth/email/request', {
                        method: 'POST',
                        body: { email: user?.email },
                      });
                      action.setMessage(
                        'Si el correo está disponible, recibirás un enlace nuevo.',
                      );
                    });
                  }}
                />
              )}
            </>
          )}
          <Button
            title="Actualizar estado"
            secondary
            disabled={action.busy}
            onPress={() => {
              void action.run(session.refresh);
            }}
          />
          <Link href="/account-settings" style={s.link}>
            Cuenta y privacidad
          </Link>
          <Button
            title="Cerrar sesión"
            secondary
            disabled={action.busy}
            onPress={() => {
              void action.run(session.signOut);
            }}
          />
        </>
      )}
      <AccountFeedback error={action.error}>{action.message}</AccountFeedback>
      {token && (
        <Link href="/" style={s.link}>
          Continuar a RuTeam
        </Link>
      )}
    </AccountPage>
  );
}

export function RecoverAccessScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [value, setValue] = useState('');
  const action = useAccountAction();
  const access = useAccessConfiguration(!token);
  const declared = access.data?.institutionalAccess === 'DECLARED_DOMAIN';
  const canRequest = access.data?.accountEmailAvailable === true;

  async function submit() {
    const path = token ? '/auth/password/reset' : '/auth/password/request';
    await api(path, {
      method: 'POST',
      body: token ? { token, password: value } : { email: value.trim() },
    });
    action.setMessage(
      token
        ? 'Contraseña actualizada. Inicia sesión con tu contraseña nueva.'
        : 'Si la cuenta admite recuperación por correo, recibirás instrucciones.',
    );
    setValue('');
  }

  return (
    <AccountPage title={token ? 'Cambia tu contraseña' : 'Recuperar acceso'}>
      {!token && access.isPending && (
        <ActivityIndicator accessibilityLabel="Consultando opciones de recuperación" />
      )}
      {!token && access.isSuccess && !canRequest && (
        <Text style={s.text}>
          La recuperación por correo está temporalmente indisponible.
        </Text>
      )}
      {!token && declared && (
        <Text style={s.text}>
          La recuperación por correo está reservada a las cuentas que ya
          verificaron la titularidad.
        </Text>
      )}
      {(token || canRequest) && (
        <>
          <AccountField
            label={token ? 'Contraseña nueva' : 'Correo institucional'}
            secureTextEntry={!!token}
            autoCapitalize="none"
            autoComplete={token ? 'new-password' : 'email'}
            value={value}
            onChangeText={setValue}
          />
          <Button
            title={token ? 'Guardar contraseña' : 'Enviar enlace'}
            disabled={
              action.busy ||
              (token
                ? value.length < 12 || value.length > 128
                : !value.includes('@'))
            }
            onPress={() => {
              void action.run(submit);
            }}
          />
        </>
      )}
      <AccountFeedback
        error={action.error ?? (!token ? access.error?.message : undefined)}
      >
        {action.message}
      </AccountFeedback>
      <Link href="/" style={s.link}>
        Volver a iniciar sesión
      </Link>
    </AccountPage>
  );
}

export function PrivacyScreen() {
  return (
    <AccountPage title="Privacidad y condiciones de uso">
      <Text style={s.text}>
        RuTeam facilita compartir viajes programados hacia o desde la
        Universidad Santiago de Cali.
      </Text>
      <Text style={s.text}>
        Usamos tu correo para administrar el acceso. Tus preferencias de
        movilidad son privadas. En los viajes se comparte la información
        necesaria para coordinar el encuentro.
      </Text>
      <Text style={s.text}>
        Selecciona puntos públicos y evita publicar tu domicilio, documentos o
        datos de otras personas.
      </Text>
      <Text style={s.text}>
        En un viaje activo, el conductor puede compartir actualizaciones de
        ubicación mientras la app esté en primer plano. Cada muestra visible
        para los participantes autorizados caduca en dos minutos. El conductor
        puede pausar o retirar la posición desde Seguridad del viaje.
      </Text>
      <Text style={s.text}>
        Los comentarios de calificación quedan en el historial de quien los
        escribió. Las personas autorizadas a consultar un viaje ven el promedio
        y la cantidad.
      </Text>
      <Link href="/" style={s.link}>
        Volver a RuTeam
      </Link>
    </AccountPage>
  );
}

const stepTitles = [
  'Tu cuenta',
  '¿Cómo usarás RuTeam?',
  'Tu movilidad',
  'Habilitación para conducir',
  'Ya puedes empezar',
];

export function OnboardingScreen() {
  const session = useSession();
  const [preference, setPreference] = useState<UsagePreference | null>(null);
  const action = useAccountAction();
  const { user } = session;

  if (session.loading)
    return <ActivityIndicator accessibilityLabel="Consultando sesión" />;
  if (!user) return <Redirect href="/" />;
  if (!user.capabilities.passenger) return <Redirect href="/verify-email" />;
  if (user.onboarding.completed) return <Redirect href="/" />;

  const step = Math.min(user.onboarding.step, 4);
  const selected = preference ?? user.usagePreference ?? 'PASSENGER';
  const driverIntent = selected === 'DRIVER_AND_PASSENGER';
  const ready = step === 4;
  async function advance() {
    await session.saveOnboarding({
      step: ready ? step : step + 1,
      ...(step === 1 ? { usagePreference: selected } : {}),
      ...(ready ? { complete: true } : {}),
    });
  }

  return (
    <AccountPage title={stepTitles[step] ?? 'Configuración inicial'}>
      <Text style={s.text}>
        Paso {step + 1} de {stepTitles.length}
      </Text>
      {step === 0 && (
        <View style={s.field}>
          <Text style={s.label}>{user.profile.displayName}</Text>
          <Text style={s.text}>{user.email}</Text>
          <Text style={s.text}>
            {user.eligibility.status === 'DECLARED'
              ? eligibilityLabels.DECLARED
              : user.emailVerified
                ? 'Correo confirmado'
                : eligibilityLabels[user.eligibility.status]}
          </Text>
        </View>
      )}
      {step === 1 && <UsageChoices value={selected} onChange={setPreference} />}
      {step === 2 && (
        <>
          <Text style={s.text}>
            Personaliza tus recomendaciones con zonas y horarios habituales.
            Puedes configurarlas ahora o desde Perfil cuando lo prefieras.
          </Text>
          <Link href="/mobility" style={s.link}>
            Configurar movilidad
          </Link>
        </>
      )}
      {step === 3 &&
        (driverIntent ? (
          <>
            <Text style={s.text}>
              Registra el vehículo, la licencia y el SOAT para consultar tu
              habilitación.
            </Text>
            <Link href="/vehicles" style={s.link}>
              Gestionar vehículos y documentos
            </Link>
          </>
        ) : (
          <Text style={s.text}>
            Puedes iniciar tu habilitación para conducir desde el perfil cuando
            lo necesites.
          </Text>
        ))}
      {ready && (
        <Text style={s.text}>
          Consulta los viajes publicados y confirma tu participación cuando
          encuentres uno que te sirva.
        </Text>
      )}
      <AccountFeedback error={action.error} />
      <Button
        title={
          ready
            ? 'Ir al inicio'
            : step === 2 || (step === 3 && driverIntent)
              ? 'Continuar'
              : 'Siguiente'
        }
        disabled={action.busy}
        onPress={() => {
          void action.run(advance);
        }}
      />
      <Button
        title="Cerrar sesión"
        secondary
        disabled={action.busy}
        onPress={() => {
          void action.run(session.signOut);
        }}
      />
    </AccountPage>
  );
}
