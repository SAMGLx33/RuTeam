import { useEffect, useState } from 'react';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Text } from 'react-native';
import type { TripNotificationView } from '@ruteam/contracts';
import { AccountPage, accountStyles } from '../../components/ui/account-page';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api, ApiError } from '../../services/api/client';
import {
  parseOpenTarget,
  peekGroupInvitation,
  takeGroupInvitation,
} from '../../services/notifications/navigation-path';
import { OnboardingScreen, VerificationScreen } from '../auth/account-screens';
import { LoginScreen } from '../auth/login-screen';
import { GroupsScreen } from '../groups/groups-screen';
import { notificationContent } from './notification-content';

function NoticeLink({ id, accountId }: { id: string; accountId: string }) {
  const client = useQueryClient();
  const notice = useQuery({
    queryKey: ['open-notice', accountId, id],
    queryFn: ({ signal }) =>
      api<TripNotificationView>(`/notifications/${id}/read`, {
        method: 'POST',
        signal,
      }),
    gcTime: 0,
    networkMode: 'always',
  });
  useEffect(() => {
    if (!notice.data) return;
    void client.invalidateQueries({ queryKey: ['notifications', accountId] });
    void client.invalidateQueries({
      queryKey: ['notification-list', accountId],
    });
  }, [accountId, client, notice.data]);
  if (notice.isPending || notice.isFetching)
    return <ActivityIndicator accessibilityLabel="Consultando aviso" />;
  const current = !notice.error && notice.data?.id === id ? notice.data : null;
  const content = current ? notificationContent(current) : null;
  if (current?.available && content?.href)
    return <Redirect href={content.href} />;
  const unavailable =
    notice.error instanceof ApiError &&
    [403, 404, 410].includes(notice.error.status);
  return (
    <ProtectedPage title="Abrir aviso">
      <Text
        accessibilityRole={notice.error ? 'alert' : undefined}
        style={s.text}
      >
        {content?.unavailable ??
          (notice.error && !unavailable
            ? 'No pudimos consultar el aviso. Puedes volver a intentarlo.'
            : 'Este aviso ya no está disponible para tu cuenta.')}
      </Text>
      {notice.error && !unavailable && (
        <Button
          secondary
          title="Volver a intentar"
          onPress={() => void notice.refetch()}
        />
      )}
      <Link href="/notifications" style={s.link}>
        Abrir la bandeja
      </Link>
    </ProtectedPage>
  );
}

function GroupLink({ id }: { id: string }) {
  const [code] = useState(() => peekGroupInvitation(id));
  useEffect(() => {
    takeGroupInvitation(id);
  }, [id]);
  if (code) return <GroupsScreen invitationCode={code} />;
  return (
    <ProtectedPage title="Invitación grupal">
      <Text style={s.text}>
        Esta invitación ya no está disponible. Vuelve a abrir el enlace o pega
        el código en Mis grupos.
      </Text>
      <Link href="/groups" style={s.link}>
        Abrir Mis grupos
      </Link>
    </ProtectedPage>
  );
}

export function OpenInternalLinkScreen() {
  const { target } = useLocalSearchParams<{ target?: string[] }>();
  const destination = parseOpenTarget(target);
  const { user, loading } = useSession();
  if (!destination)
    return (
      <AccountPage title="Enlace de RuTeam">
        <Text style={accountStyles.text}>
          El enlace está incompleto o ya no está disponible.
        </Text>
        <Link href="/" style={accountStyles.link}>
          Ir a Inicio
        </Link>
      </AccountPage>
    );
  if (loading)
    return <ActivityIndicator accessibilityLabel="Consultando sesión" />;
  if (!user)
    return (
      <LoginScreen reason="Inicia sesión para abrir el enlace de RuTeam." />
    );
  if (!user.capabilities.passenger) return <VerificationScreen />;
  if (!user.onboarding.completed) return <OnboardingScreen />;
  switch (destination.kind) {
    case 'notice':
      return (
        <NoticeLink
          key={`${user.id}:${destination.id}`}
          id={destination.id}
          accountId={user.id}
        />
      );
    case 'trip':
      return (
        <Redirect
          href={{ pathname: '/trip/[id]', params: { id: destination.id } }}
        />
      );
    case 'chat':
      return (
        <Redirect
          href={{
            pathname: '/chat/[tripId]',
            params: { tripId: destination.id },
          }}
        />
      );
    case 'group':
      return (
        <GroupLink key={`${user.id}:${destination.id}`} id={destination.id} />
      );
    case 'activity':
      return (
        <Redirect
          href={
            destination.id
              ? { pathname: '/activity', params: { activity: destination.id } }
              : '/activity'
          }
        />
      );
    case 'records':
      return (
        <Redirect
          href={
            destination.id
              ? {
                  pathname: '/trip-operation/[tripId]',
                  params: { tripId: destination.id },
                }
              : '/my-reservations'
          }
        />
      );
  }
}
