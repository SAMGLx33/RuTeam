import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CurrentUser, CampusDestination } from '@ruteam/contracts';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Button } from '../../components/ui/button';
import { colors } from '../../theme/tokens';
const schema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Escribe al menos dos caracteres.')
    .max(80, 'Máximo 80 caracteres.'),
});
const groups: Record<string, string> = {
  STUDENT: 'Estudiante',
  TEACHER: 'Docente',
  ADMINISTRATIVE: 'Administrativo',
  WORKER: 'Trabajador',
  OTHER: 'Otro estamento',
};
export function ProfileScreen({ user }: { user: CurrentUser }) {
  const { signOut } = useSession();
  const client = useQueryClient();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { displayName: user.profile.displayName },
  });
  const { reset } = form;
  useEffect(() => {
    reset({ displayName: user.profile.displayName });
  }, [user.profile.displayName, reset]);
  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      api<{ displayName: string }>('/me/profile', {
        method: 'PATCH',
        body: values,
      }),
    onSuccess: (profile) =>
      client.setQueryData<CurrentUser>(['me'], (old) =>
        old ? { ...old, profile } : old,
      ),
  });
  const destinations = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api<CampusDestination[]>('/campus/destinations'),
    retry: false,
  });
  async function logout() {
    setLeaving(true);
    setLogoutError(null);
    try {
      await signOut();
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : 'No pudimos cerrar sesión',
      );
    } finally {
      setLeaving(false);
    }
  }
  return (
    <View style={styles.content}>
      <Text role="heading" aria-level={1} style={styles.title}>
        Hola, {user.profile.displayName}
      </Text>
      <Text style={styles.status}>
        {groups[user.membership.group]} · ACTIVA
      </Text>
      <Text style={styles.detail}>{user.email}</Text>
      <Text style={styles.detail}>
        Rol: {user.role === 'ADMIN' ? 'Administración' : 'Miembro'}
        {user.capabilities.driver ? ' · Conductor demo' : ' · Pasajero'}
      </Text>
      <Link href="/vehicles" style={styles.label}>
        Vehículos y licencia DEMO
      </Link>
      <Link href="/publish" style={styles.label}>
        Publicar viaje hacia USC
      </Link>
      <Link href="/my-trips" style={styles.label}>
        Mis viajes publicados
      </Link>
      {user.role === 'ADMIN' && (
        <Link href="/document-reviews" style={styles.label}>
          Revisar documentos DEMO
        </Link>
      )}
      <Text style={styles.label}>Nombre para mostrar</Text>
      <Controller
        name="displayName"
        control={form.control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            accessibilityLabel="Nombre para mostrar"
            value={value}
            onChangeText={(text) => {
              onChange(text);
              save.reset();
            }}
            onBlur={onBlur}
            maxLength={80}
            style={styles.input}
            autoCapitalize="words"
          />
        )}
      />
      {form.formState.errors.displayName && (
        <Text accessibilityRole="alert" style={styles.error}>
          {form.formState.errors.displayName.message}
        </Text>
      )}
      {save.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {save.error.message}
        </Text>
      )}
      {save.isSuccess && (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          Perfil guardado en PostgreSQL.
        </Text>
      )}
      <Button
        title={save.isPending ? 'Guardando…' : 'Guardar perfil'}
        disabled={save.isPending || leaving}
        onPress={() => {
          void form.handleSubmit((values) => save.mutate(values))();
        }}
      />
      <Button
        title={leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
        disabled={leaving || save.isPending}
        secondary
        onPress={() => {
          void logout();
        }}
      />
      {logoutError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {logoutError}
        </Text>
      )}
      <View style={styles.catalog}>
        <Text style={styles.label}>Destino de la comunidad</Text>
        {destinations.isPending && (
          <Text style={styles.detail}>Consultando catálogo USC…</Text>
        )}
        {destinations.error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {destinations.error.message}
          </Text>
        )}
        {destinations.data?.length === 0 && (
          <Text style={styles.detail}>No hay puntos disponibles.</Text>
        )}
        {destinations.data?.map((point) => (
          <Text key={point.id} style={styles.detail}>
            {point.name}
            {point.demo ? ' · DEMO' : ''}
          </Text>
        ))}
        <Text style={styles.note}>
          Reservas, recorrido y compensaciones están planificados para fases
          posteriores.
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  content: {
    maxWidth: 530,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 30,
    gap: 18,
  },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800' },
  status: {
    color: colors.primary,
    backgroundColor: colors.selected,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontWeight: '700',
    fontSize: 17,
  },
  detail: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.ink, fontWeight: '700', fontSize: 17, marginTop: 12 },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    padding: 15,
    fontSize: 18,
    minHeight: 54,
  },
  error: { color: colors.danger, lineHeight: 23 },
  success: { color: colors.success },
  catalog: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
    gap: 12,
  },
  note: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
