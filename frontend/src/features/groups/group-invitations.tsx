import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { CreatedTripGroup, CreateTripGroupInput } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';
import { Choice } from '../trips/itinerary-form';
import { travelTime } from '../trips/route-preview';

export function InvitationCode({
  invitation,
}: {
  invitation: CreatedTripGroup;
}) {
  return (
    <View style={styles.codeBox}>
      <Text style={s.title}>Código de invitación</Text>
      <Text
        selectable
        style={styles.code}
        accessibilityLabel="Código de invitación generado"
      >
        {invitation.invitationCode}
      </Text>
      <Text style={s.text}>
        Comparte el código sólo con tus compañeros. Vence el{' '}
        {travelTime(invitation.group.expiresAt)}.
      </Text>
    </View>
  );
}

export function GroupInvitationForm({
  tripId,
  pickupId,
  dropoffId,
  offeredSeats,
}: {
  tripId: string;
  pickupId: string;
  dropoffId: string | undefined;
  offeredSeats: number;
}) {
  const { user } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(2);
  const creation = useMutation({
    gcTime: 0,
    mutationFn: (body: CreateTripGroupInput) =>
      api<CreatedTripGroup>(`/trips/${tripId}/groups`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['trip-groups', user?.id] });
    },
  });
  if (creation.data)
    return (
      <>
        <InvitationCode invitation={creation.data} />
        <Link href="/groups" style={s.link}>
          Ver mis grupos
        </Link>
      </>
    );
  return (
    <>
      <Button
        secondary
        title={open ? 'Ocultar invitación grupal' : 'Viajar con un grupo'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text style={s.title}>¿Cuántas personas viajan contigo?</Text>
          <Text style={s.text}>
            Inclúyete en el total. Todos usarán la recogida y el descenso
            elegidos. Crear la invitación registra tu consentimiento. Las plazas
            se asignan al confirmar juntos.
          </Text>
          {[2, 3, 4]
            .filter((size) => size <= offeredSeats)
            .map((size) => (
              <Choice
                key={size}
                label={`${size} personas en total`}
                checked={count === size}
                onPress={() => setCount(size)}
              />
            ))}
          {creation.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {creation.error.message}
            </Text>
          )}
          <Button
            title={
              creation.isPending
                ? 'Creando invitación…'
                : 'Consentir y crear invitación'
            }
            disabled={creation.isPending || !pickupId || !dropoffId}
            onPress={() => {
              if (pickupId && dropoffId)
                creation.mutate({
                  pickupId,
                  dropoffId,
                  expectedMembers: count,
                });
            }}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    padding: 14,
    gap: 8,
    borderRadius: 10,
    backgroundColor: colors.selected,
  },
  code: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    flexShrink: 1,
  },
});
