import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  RatingTarget,
  SubmittedRating,
  SubmitRatingInput,
  TripRatingDetail,
  TripRatingsPage,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';
import { tripDate } from '../trips/trip-feed';
import { ReputationLabel } from './reputation-label';

const stars = [1, 2, 3, 4, 5];
function TargetForm({
  target,
  tripId,
}: {
  target: RatingTarget;
  tripId: string;
}) {
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [review, setReview] = useState(false);
  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: (input: SubmitRatingInput) =>
      api<SubmittedRating>(`/trips/${tripId}/ratings`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      Promise.all(
        [
          ['ratings'],
          ['trip-feed'],
          ['trip-detail'],
          ['available-trips'],
          ['driver-participations'],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
  const result = target.submitted ?? submit.data;
  const capacity = target.capacity === 'DRIVER' ? 'Conductor' : 'Pasajero';
  return (
    <View style={s.section}>
      <Text style={s.title}>{target.name ?? 'Estudiante RuTeam'}</Text>
      <Text style={s.text}>{capacity}</Text>
      {result ? (
        <>
          <Text accessibilityLiveRegion="polite" style={s.text}>
            Calificación enviada · {result.stars} / 5
          </Text>
          {!!result.comment && (
            <Text style={s.text}>Tu comentario · {result.comment}</Text>
          )}
        </>
      ) : review ? (
        <>
          <Text style={s.text}>
            Vas a enviar {selected} de 5 estrellas. Podrás consultar la
            calificación en tu historial.
          </Text>
          {!!comment.trim() && <Text style={s.text}>{comment.trim()}</Text>}
          <Button
            title="Enviar calificación"
            disabled={submit.isPending}
            onPress={() =>
              submit.mutate({
                rateeId: target.rateeId,
                stars: selected,
                comment: comment.trim() || undefined,
              })
            }
          />
          <Button
            title="Volver a editar"
            secondary
            disabled={submit.isPending}
            onPress={() => setReview(false)}
          />
        </>
      ) : (
        <>
          <View style={styles.stars}>
            {stars.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={
                  value === 1 ? '1 estrella' : `${value} estrellas`
                }
                accessibilityState={{ checked: selected === value }}
                onPress={() => setSelected(value)}
                style={[
                  styles.starButton,
                  selected === value && styles.selected,
                ]}
              >
                <Text style={styles.star}>{value <= selected ? '★' : '☆'}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.text}>
            Comentario opcional · visible en tu historial
          </Text>
          <TextInput
            accessibilityLabel="Comentario privado"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            multiline
            style={styles.input}
          />
          <Button
            title="Revisar calificación"
            disabled={!selected}
            onPress={() => {
              submit.reset();
              setReview(true);
            }}
          />
        </>
      )}
      {submit.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {submit.error.message}
        </Text>
      )}
    </View>
  );
}

export function RatingsHistoryScreen() {
  const { user } = useSession();
  const query = useInfiniteQuery({
    queryKey: ['ratings', 'history', user?.id],
    enabled: !!user?.capabilities.passenger,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<TripRatingsPage>(
        `/ratings${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <ProtectedPage title="Mis calificaciones">
      {query.isPending && (
        <Text style={s.text}>Consultando tus calificaciones…</Text>
      )}
      {query.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error.message}
        </Text>
      )}
      {query.data && (
        <View style={s.section}>
          <Text style={s.title}>Tu reputación</Text>
          {query.data.pages[0]?.reputations.map((summary) => (
            <ReputationLabel key={summary.capacity} summary={summary} />
          ))}
        </View>
      )}
      {query.data && !items.length && (
        <Text style={s.text}>
          Tus viajes completados con abordaje aparecerán aquí.
        </Text>
      )}
      {items.map((item) => {
        const pending = item.targets.filter(
          (target) => !target.submitted,
        ).length;
        return (
          <View key={item.tripId} style={s.section}>
            <Text style={s.title}>
              {item.origin} → {item.destination}
            </Text>
            {!!item.completedAt && (
              <Text style={s.text}>{tripDate(item.completedAt)}</Text>
            )}
            <Text style={s.text}>
              {pending
                ? `${pending} ${pending === 1 ? 'evaluación pendiente' : 'evaluaciones pendientes'}`
                : 'Evaluaciones enviadas'}
            </Text>
            <Link
              href={{
                pathname: '/ratings/[tripId]',
                params: { tripId: item.tripId },
              }}
              style={s.link}
            >
              Ver calificaciones del viaje
            </Link>
          </View>
        );
      })}
      {query.hasNextPage && (
        <Button
          title="Ver más viajes"
          secondary
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        />
      )}
    </ProtectedPage>
  );
}

export function TripRatingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useSession();
  const query = useQuery({
    queryKey: ['ratings', 'trip', tripId, user?.id],
    enabled: !!user?.capabilities.passenger && !!tripId,
    queryFn: () => api<TripRatingDetail>(`/trips/${tripId}/ratings`),
  });
  return (
    <ProtectedPage title="Calificaciones del viaje">
      {query.data && (
        <Link
          href={{
            pathname: '/economic-history',
            params: {
              tripId,
              role: query.data.targets.some(
                ({ capacity }) => capacity === 'PASSENGER',
              )
                ? 'DRIVER'
                : 'PASSENGER',
            },
          }}
          style={s.link}
        >
          Consultar compensaciones del viaje
        </Link>
      )}
      <Link href="/ratings" style={s.link}>
        Mis calificaciones
      </Link>
      {query.isPending && <Text style={s.text}>Consultando el viaje…</Text>}
      {query.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error.message}
        </Text>
      )}
      {query.data && (
        <>
          <Text style={s.title}>
            {query.data.origin} → {query.data.destination}
          </Text>
          {!!query.data.completedAt && (
            <Text style={s.text}>
              Viaje completado · {tripDate(query.data.completedAt)}
            </Text>
          )}
          {query.data.targets.length === 0 && (
            <Text style={s.text}>
              No hay pasajeros con abordaje registrado para calificar.
            </Text>
          )}
          {query.data.targets.map((target) => (
            <TargetForm
              key={target.rateeId}
              target={target}
              tripId={query.data.tripId}
            />
          ))}
        </>
      )}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  starButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.surface, borderColor: colors.primary },
  star: { fontSize: 25, color: colors.primary },
  input: {
    minHeight: 84,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 8,
    borderColor: colors.border,
    color: colors.dark,
    padding: 10,
  },
});
