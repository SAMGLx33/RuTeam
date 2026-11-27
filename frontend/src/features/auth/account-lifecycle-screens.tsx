import { useState } from 'react';
import { Link, Redirect, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type {
  AccountLifecycleStatus,
  AccountSettings,
  CancellationReason,
} from '@ruteam/contracts';
import {
  AccountPage,
  accountStyles as s,
} from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { AccountFeedback, AccountField } from './login-screen';
import { travelTime } from '../trips/route-preview';
import { CancellationReasons } from '../trips/cancellation-reasons';
import { Choice } from '../trips/itinerary-form';

function Status({ status }: { status: AccountLifecycleStatus }) {
  const request = status.deletionRequest;
  return (
    <>
      <Text style={s.text}>
        {status.state === 'ACTIVE' ? 'Cuenta activa' : 'Cuenta desactivada'}
      </Text>
      {request && (
        <Text style={s.text}>
          {request.status === 'REQUESTED'
            ? 'Solicitud registrada'
            : 'Solicitud retirada'}{' '}
          · {travelTime(request.requestedAt)}. La eliminación efectiva está
          sujeta a una política de conservación.
        </Text>
      )}
    </>
  );
}

function ActiveTripClosure({
  trip,
  refresh,
}: {
  trip: AccountSettings['activeTrips'][number];
  refresh: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] =
    useState<Exclude<CancellationReason, 'ACCOUNT_CLOSED'>>();
  const [safe, setSafe] = useState(false);
  const close = useMutation({
    mutationFn: () =>
      api('/trips/' + trip.id + '/transition', {
        method: 'POST',
        body: { action: 'INTERRUPT', reason, confirmedSafe: safe },
      }),
    onSuccess: refresh,
  });
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.text}>Viaje activo · {travelTime(trip.departureAt)}</Text>
      {editing ? (
        <>
          <Text style={s.text}>
            Detén el vehículo en un lugar seguro. Informa a las personas a bordo
            y coordina su descenso antes de confirmar.
          </Text>
          <CancellationReasons reason={reason} choose={setReason} asDriver />
          <Choice
            label="El vehículo está detenido y coordiné el descenso seguro"
            checkbox
            checked={safe}
            onPress={() => setSafe(!safe)}
          />
          <Button
            title="Confirmar interrupción"
            disabled={!reason || !safe || close.isPending}
            onPress={() => close.mutate()}
          />
          <Button
            title="Volver sin cerrar el viaje"
            secondary
            disabled={close.isPending}
            onPress={() => {
              setEditing(false);
              setReason(undefined);
              setSafe(false);
              close.reset();
            }}
          />
        </>
      ) : (
        <Button
          title="Interrumpir viaje"
          secondary
          onPress={() => setEditing(true)}
        />
      )}
      <AccountFeedback error={close.error?.message} />
    </View>
  );
}

export function AccountSettingsScreen() {
  const { user, loading, signOut } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [action, setAction] = useState<{
    type: 'DEACTIVATE' | 'REQUEST_DELETION' | 'REVOKE';
    id?: string;
  }>();
  const settings = useQuery({
    queryKey: ['account-settings', user?.id],
    queryFn: () => api<AccountSettings>('/auth/lifecycle'),
    enabled: !!user,
    gcTime: 0,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!action) return null;
      if (action.type === 'REVOKE') {
        await api<void>('/auth/lifecycle/sessions/' + action.id + '/revoke', {
          method: 'POST',
          body: { password },
        });
        return null;
      }
      return api<AccountLifecycleStatus>('/auth/lifecycle/close', {
        method: 'POST',
        body: { password, action: action.type, confirmed: true },
      });
    },
    onSuccess: async (closed) => {
      setPassword('');
      setAction(undefined);
      if (closed) {
        await signOut();
        router.replace('/account-status');
      } else await settings.refetch();
    },
  });
  if (!loading && !user) return <Redirect href="/" />;
  return (
    <AccountPage title="Cuenta y privacidad">
      <Link href="/profile" style={s.link}>
        Volver a Perfil
      </Link>
      <Link href="/privacy" style={s.link}>
        Consultar privacidad y condiciones de uso
      </Link>
      {settings.isPending && <Text style={s.text}>Consultando tu cuenta…</Text>}
      {settings.data && (
        <>
          <Status status={settings.data} />
          <Text style={s.text}>Sesiones activas</Text>
          {settings.data.sessions.map((session) => (
            <View key={session.id} style={{ gap: 6 }}>
              <Text style={s.text}>
                {session.current ? 'Este dispositivo' : 'Otra sesión'} ·
                Iniciada{' '}
                {session.createdAt
                  ? travelTime(session.createdAt)
                  : 'en una fecha anterior'}{' '}
                · Vence {travelTime(session.expiresAt)}
              </Text>
              {!session.current && (
                <Button
                  title="Revocar esta sesión"
                  secondary
                  disabled={save.isPending}
                  onPress={() => {
                    setAction({ type: 'REVOKE', id: session.id });
                    setPassword('');
                    save.reset();
                  }}
                />
              )}
            </View>
          ))}
          <Button
            title="Cerrar sesión en este dispositivo"
            secondary
            disabled={save.isPending}
            onPress={() => void signOut()}
          />
          <Text style={s.text}>
            Al desactivar la cuenta se cancelarán {settings.data.futureTrips}{' '}
            viajes futuros propios y se retirarán{' '}
            {settings.data.futureParticipations} participaciones futuras. Las{' '}
            {settings.data.activeSchedules} recurrencias activas quedarán
            pausadas.
          </Text>
          {settings.data.activeTrips.length ? (
            <>
              <Text style={s.error}>
                Resuelve el viaje activo antes de desactivar tu cuenta.
              </Text>
              {settings.data.activeTrips.map((trip) => {
                if (
                  !user?.capabilities.driverAccess &&
                  trip.asDriver &&
                  trip.status === 'EN_CURSO'
                ) {
                  return (
                    <ActiveTripClosure
                      key={trip.id}
                      trip={trip}
                      refresh={settings.refetch}
                    />
                  );
                }
                if (!user?.capabilities.passenger) {
                  return (
                    <Text key={trip.id} style={s.text}>
                      El cierre estará disponible cuando se resuelva tu
                      participación o viaje del {travelTime(trip.departureAt)}.
                    </Text>
                  );
                }
                return (
                  <Link
                    key={trip.id}
                    href={trip.asDriver ? '/my-trips' : '/my-reservations'}
                    style={s.link}
                  >
                    {trip.asDriver
                      ? 'Gestionar viaje como conductor'
                      : 'Revisar mi participación'}{' '}
                    · {travelTime(trip.departureAt)}
                  </Link>
                );
              })}
            </>
          ) : (
            <>
              <Button
                title="Desactivar mi cuenta"
                secondary
                disabled={save.isPending}
                onPress={() => {
                  setAction({ type: 'DEACTIVATE' });
                  setPassword('');
                  save.reset();
                }}
              />
              <Button
                title="Solicitar eliminación"
                secondary
                disabled={save.isPending}
                onPress={() => {
                  setAction({ type: 'REQUEST_DELETION' });
                  setPassword('');
                  save.reset();
                }}
              />
            </>
          )}
        </>
      )}
      {action && (
        <>
          <Text style={s.text}>
            {action.type === 'REQUEST_DELETION'
              ? 'Se desactivará la cuenta y se guardará tu solicitud. Podrás consultarla con tu correo y contraseña.'
              : action.type === 'DEACTIVATE'
                ? 'Se cerrarán todas tus sesiones al confirmar.'
                : 'Se cerrará la sesión seleccionada.'}
          </Text>
          <AccountField
            label="Confirma tu contraseña actual"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
          />
          <Button
            title={
              action.type === 'REVOKE'
                ? 'Confirmar revocación'
                : action.type === 'DEACTIVATE'
                  ? 'Confirmar desactivación'
                  : 'Confirmar solicitud de eliminación'
            }
            disabled={!password || save.isPending}
            onPress={() => save.mutate()}
          />
          <Button
            title="Volver sin cambios"
            secondary
            disabled={save.isPending}
            onPress={() => {
              setAction(undefined);
              setPassword('');
              save.reset();
            }}
          />
        </>
      )}
      <AccountFeedback
        error={settings.error?.message ?? save.error?.message ?? null}
      />
    </AccountPage>
  );
}

export function AccountStatusScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AccountLifecycleStatus | null>(null);
  const [pending, setPending] = useState<'REACTIVATE' | 'WITHDRAW_DELETION'>();
  const request = useMutation({
    mutationFn: (action?: typeof pending) =>
      api<AccountLifecycleStatus>(
        '/auth/lifecycle/' + (action ? 'recover' : 'status'),
        {
          method: 'POST',
          body: action
            ? { email, password, action, confirmed: true }
            : { email, password },
        },
      ),
    onSuccess: (data) => {
      setStatus(data);
      setPassword('');
      setPending(undefined);
    },
  });
  return (
    <AccountPage title="Estado de la cuenta">
      <AccountField
        label="Correo institucional"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setStatus(null);
          setPending(undefined);
        }}
      />
      <AccountField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={
          pending
            ? pending === 'REACTIVATE'
              ? 'Confirmar reactivación'
              : 'Confirmar retiro de la solicitud'
            : 'Consultar estado'
        }
        disabled={!email.includes('@') || !password || request.isPending}
        onPress={() => request.mutate(pending)}
      />
      {pending && (
        <Button
          title="Volver sin cambios"
          secondary
          onPress={() => setPending(undefined)}
        />
      )}
      {status && (
        <>
          <Status status={status} />
          {!pending && status.deletionRequest?.status === 'REQUESTED' && (
            <Button
              title="Retirar solicitud de eliminación"
              secondary
              onPress={() => setPending('WITHDRAW_DELETION')}
            />
          )}
          {!pending && status.canReactivate && (
            <Button
              title="Reactivar la cuenta"
              secondary
              onPress={() => setPending('REACTIVATE')}
            />
          )}
        </>
      )}
      <AccountFeedback error={request.error?.message ?? null} />
      <Link href="/" style={s.link}>
        Volver a iniciar sesión
      </Link>
    </AccountPage>
  );
}
