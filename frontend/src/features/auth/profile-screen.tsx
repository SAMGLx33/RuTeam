import { EmergencyContactSettings } from '../safety/emergency-contacts';
import { Link } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import type { Account, ReputationSummary } from '@ruteam/contracts';
import { Field } from '../../components/forms/field';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { AccountFeedback, useAccountAction } from './login-screen';
import { ReputationLabel } from '../ratings/reputation-label';
import { eligibilityLabels } from './account-screens';

function ProfileSettings({ user }: { user: Account }) {
  const { refresh, saveOnboarding, signOut } = useSession();
  const action = useAccountAction();
  const reputation = useQuery({
    queryKey: ['ratings', 'reputation', user.id],
    queryFn: () => api<ReputationSummary[]>('/ratings/reputation'),
    enabled: user.capabilities.passenger,
  });
  const { control, handleSubmit } = useForm({
    defaultValues: { displayName: user.profile.displayName },
  });
  const save = useMutation({
    mutationFn: (body: { displayName: string }) =>
      api('/me/profile', {
        method: 'PATCH',
        body: { displayName: body.displayName.trim() },
      }),
    onSuccess: refresh,
  });

  return (
    <>
      <View style={s.section}>
        <Text style={s.title}>Tu cuenta</Text>
        <Text style={s.text}>{user.email}</Text>
        <Text style={s.text}>
          {user.synthetic
            ? 'Cuenta de pruebas'
            : eligibilityLabels[user.eligibility.status]}
        </Text>
        <Field control={control} name="displayName" label="Nombre visible" />
        <AccountFeedback error={save.error?.message}>
          {save.isSuccess ? 'Nombre actualizado.' : null}
        </AccountFeedback>
        <Button
          title="Guardar nombre"
          disabled={save.isPending}
          onPress={() => {
            void handleSubmit((value) => save.mutate(value))();
          }}
        />
      </View>
      <View style={s.section}>
        <Text style={s.title}>Movilidad</Text>
        <Link href="/economic-history" style={s.link}>
          Historial económico
        </Link>
        <Link href="/mobility-statistics" style={s.link}>
          Estadísticas de movilidad
        </Link>
        <Link href="/mobility" style={s.link}>
          Preferencias de movilidad
        </Link>
      </View>
      <View style={s.section}>
        <Text style={s.title}>Conducción</Text>
        {user.capabilities.driverAccess ? (
          <>
            <Text style={s.text}>
              {user.capabilities.driver
                ? 'Puedes publicar viajes.'
                : 'Revisa tu licencia y el estado de los documentos de tu vehículo antes de publicar.'}
            </Text>
            <Link href="/vehicles" style={s.link}>
              Vehículos y licencia
            </Link>
            <Link href="/my-trips" style={s.link}>
              Mis viajes publicados
            </Link>
            {user.capabilities.driver && (
              <Link href="/publish" style={s.link}>
                Publicar viaje
              </Link>
            )}
            {user.usagePreference === 'DRIVER_AND_PASSENGER' && (
              <Button
                title="Cambiar mi preferencia a pasajero"
                secondary
                disabled={action.busy}
                onPress={() => {
                  void action.run(() =>
                    saveOnboarding({
                      step: user.onboarding.step,
                      usagePreference: 'PASSENGER',
                    }),
                  );
                }}
              />
            )}
          </>
        ) : (
          <Button
            title="Convertirme en conductor"
            secondary
            disabled={action.busy}
            onPress={() => {
              void action.run(() =>
                saveOnboarding({
                  step: user.onboarding.step,
                  usagePreference: 'DRIVER_AND_PASSENGER',
                }),
              );
            }}
          />
        )}
      </View>
      <View style={s.section}>
        <Text style={s.title}>Tu reputación</Text>
        {reputation.data?.map((summary) => (
          <ReputationLabel key={summary.capacity} summary={summary} />
        ))}
        <Link href="/ratings" style={s.link}>
          Mi reputación y calificaciones
        </Link>
        <Link href="/incidents" style={s.link}>
          Mis incidencias
        </Link>
        <Link href="/account-settings" style={s.link}>
          Configuración · Cuenta y privacidad
        </Link>
        <Link href="/privacy" style={s.link}>
          Privacidad y condiciones de uso
        </Link>
        <AccountFeedback error={action.error} />
        <Button
          title="Cerrar sesión"
          secondary
          disabled={action.busy}
          onPress={() => {
            void action.run(signOut);
          }}
        />
      </View>
    </>
  );
}

export function ProfileScreen() {
  const { user } = useSession();
  return (
    <ProtectedPage title="Perfil">
      {user && <ProfileSettings key={user.id} user={user} />}
      {user?.capabilities.passenger && (
        <EmergencyContactSettings key={user.id} userId={user.id} />
      )}
    </ProtectedPage>
  );
}
