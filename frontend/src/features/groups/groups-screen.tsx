import { EconomicTerms } from '../expenses/economic-terms';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  CreatedTripGroup,
  TripGroupPreview,
  TripGroupStatus,
  TripGroupView,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';
import { travelTime } from '../trips/route-preview';
import { InvitationCode } from './group-invitations';

const statusLabels: Record<TripGroupStatus, string> = {
  OPEN: 'Esperando confirmación',
  EXPIRED: 'Invitación vencida',
  REVOKED: 'Grupo cerrado por el organizador',
  CONFIRMED: 'Grupo confirmado',
  CLOSED: 'El viaje ya no admite confirmaciones',
};

function Conditions({ group }: { group: TripGroupPreview }) {
  return (
    <>
      <Text role="heading" aria-level={3} style={s.title}>
        {group.pickupLabel} → {group.dropoffLabel}
      </Text>
      <Text style={s.text}>
        {travelTime(group.departureAt)} · Conduce{' '}
        {group.driverName ?? 'un estudiante'}
      </Text>
      {group.rules.map(({ id, description }) => (
        <Text key={id} style={s.text}>
          {description}
        </Text>
      ))}
      <EconomicTerms terms={group.economics} />
      {group.providesHelmet !== null && (
        <Text style={s.text}>
          {group.providesHelmet
            ? 'El conductor proporciona casco.'
            : 'Lleva tu propio casco.'}
        </Text>
      )}
    </>
  );
}

function JoinGroup({
  onJoined,
  invitationCode,
}: {
  onJoined: () => void;
  invitationCode?: string;
}) {
  const [code, setCode] = useState(invitationCode ?? '');
  const preview = useMutation({
    gcTime: 0,
    mutationFn: (value: string) =>
      api<TripGroupPreview>('/trip-groups/preview', {
        method: 'POST',
        body: { code: value },
      }),
  });
  const join = useMutation({
    gcTime: 0,
    mutationFn: (value: string) =>
      api<TripGroupView>('/trip-groups/join', {
        method: 'POST',
        body: { code: value },
      }),
    onSuccess: () => {
      setCode('');
      preview.reset();
      onJoined();
    },
  });
  const busy = preview.isPending || join.isPending;
  return (
    <View style={s.section}>
      <Text role="heading" aria-level={2} style={s.title}>
        Tengo una invitación
      </Text>
      <Text style={s.text}>
        Revisa el trayecto y las condiciones antes de aceptar.
      </Text>
      <TextInput
        accessibilityLabel="Código de invitación"
        placeholder="Pega el código de tu grupo"
        value={code}
        onChangeText={(value) => {
          setCode(value);
          preview.reset();
          join.reset();
        }}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        maxLength={48}
        style={styles.input}
      />
      <Button
        title={preview.isPending ? 'Consultando…' : 'Consultar invitación'}
        disabled={busy || !/^[A-Za-z0-9_-]{43}$/.test(code.trim())}
        onPress={() => preview.mutate(code.trim())}
        secondary
      />
      {preview.data && (
        <>
          <Conditions group={preview.data} />
          <Text style={s.text}>
            Grupo de {preview.data.expectedMembers} personas. Aceptar expresa tu
            consentimiento. La plaza se registra cuando se confirme el grupo.
          </Text>
          <Button
            title={
              join.isPending
                ? 'Registrando consentimiento…'
                : 'Aceptar condiciones del grupo'
            }
            disabled={busy}
            onPress={() => join.mutate(code.trim())}
          />
        </>
      )}
      {(preview.error || join.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {(preview.error ?? join.error)?.message}
        </Text>
      )}
      {join.isSuccess && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          Consentimiento registrado.
        </Text>
      )}
    </View>
  );
}

type GroupAction = 'confirm' | 'leave' | 'invitation';

function GroupCard({
  group,
  onChanged,
}: {
  group: TripGroupView;
  onChanged: (action: GroupAction) => void;
}) {
  const action = useMutation<
    CreatedTripGroup | TripGroupView,
    Error,
    GroupAction
  >({
    gcTime: 0,
    mutationFn: (operation: GroupAction) =>
      operation === 'invitation'
        ? api<CreatedTripGroup>(`/trip-groups/${group.id}/invitation`, {
            method: 'POST',
          })
        : api<TripGroupView>(
            `/trip-groups/${group.id}/${operation === 'leave' ? 'membership' : 'confirm'}`,
            { method: operation === 'leave' ? 'DELETE' : 'POST' },
          ),
    onSuccess: (_, operation) => onChanged(operation),
  });
  const open = group.status === 'OPEN';
  const currentInvitation =
    action.data && 'invitationCode' in action.data ? action.data : undefined;
  return (
    <View style={s.section}>
      <Conditions group={group} />
      <Text accessibilityLiveRegion="polite" style={s.text}>
        {statusLabels[group.status]}
      </Text>
      <Text style={s.text}>
        {group.consentedMembers} de {group.expectedMembers} consentimientos
      </Text>
      {group.members.map((member, index) => (
        <Text key={index} style={s.text}>
          {member.isSelf ? 'Tú' : (member.name ?? 'Integrante')}
          {member.isOrganizer ? ' · Organizador' : ''}
        </Text>
      ))}
      {open && (
        <>
          <Text style={s.text}>
            Invitación vigente hasta el {travelTime(group.expiresAt)}.
          </Text>
          {group.isOrganizer && (
            <>
              <Button
                title={
                  action.isPending && action.variables === 'confirm'
                    ? 'Confirmando…'
                    : 'Confirmar todas las plazas'
                }
                disabled={
                  action.isPending ||
                  group.consentedMembers < group.expectedMembers
                }
                onPress={() => action.mutate('confirm')}
              />
              <Button
                title="Generar otro código"
                disabled={action.isPending}
                onPress={() => action.mutate('invitation')}
                secondary
              />
              {currentInvitation && (
                <InvitationCode invitation={currentInvitation} />
              )}
            </>
          )}
          <Button
            title={
              group.isOrganizer
                ? 'Cerrar grupo abierto'
                : 'Retirar mi consentimiento'
            }
            disabled={action.isPending}
            onPress={() => action.mutate('leave')}
            secondary
          />
        </>
      )}
      {group.status === 'CONFIRMED' && (
        <Link href="/my-reservations" style={s.link}>
          Consultar mi plaza
        </Link>
      )}
      {action.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {action.error.message}
        </Text>
      )}
    </View>
  );
}

export function GroupsScreen({ invitationCode }: { invitationCode?: string }) {
  const { user } = useSession();
  const client = useQueryClient();
  const key = ['trip-groups', user?.id] as const;
  const list = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api<TripGroupView[]>('/trip-groups', { signal }),
    enabled: !!user?.capabilities.passenger,
    refetchInterval: 8000,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: key });
  };
  return (
    <ProtectedPage title="Mis grupos">
      <Link href="/my-reservations" style={s.link}>
        Volver a mis participaciones
      </Link>
      <JoinGroup
        key={user?.id}
        onJoined={refresh}
        invitationCode={invitationCode}
      />
      {list.isPending && <Text style={s.text}>Consultando tus grupos…</Text>}
      {list.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {list.error.message}
        </Text>
      )}
      {list.data?.length === 0 && (
        <Text style={s.text}>
          Aún no tienes grupos. Puedes crear uno al elegir el encuentro de un
          viaje disponible.
        </Text>
      )}
      {list.data?.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onChanged={(action) => {
            refresh();
            if (action === 'confirm') {
              void client.invalidateQueries({ queryKey: ['my-reservations'] });
              void client.invalidateQueries({
                queryKey: ['trip-detail', group.tripId],
              });
              void client.invalidateQueries({ queryKey: ['trip-feed'] });
              void client.invalidateQueries({ queryKey: ['available-trips'] });
            }
          }}
        />
      ))}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 16,
    padding: 12,
  },
});
