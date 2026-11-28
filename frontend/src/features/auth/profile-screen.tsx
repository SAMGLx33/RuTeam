import { EmergencyContactSettings } from '../safety/emergency-contacts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
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
import { useAppearance } from '../../theme/appearance';
import { Link, Pressable, Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';
import { AccountFeedback, useAccountAction } from './login-screen';
import { ReputationLabel } from '../ratings/reputation-label';
import { eligibilityLabels } from './account-screens';

const appearances = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
] as const;

function AppearanceSettings() {
  const { preference, setPreference } = useAppearance();
  return (
    <View style={[s.section, styles.settingsCard]}>
      <Text role="heading" aria-level={2} style={s.title}>
        Apariencia
      </Text>
      <View
        role="group"
        accessibilityLabel="Tema"
        style={styles.appearanceChoices}
      >
        {appearances.map(({ id, label }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: id === preference }}
            aria-pressed={id === preference}
            style={[
              styles.appearanceChoice,
              id === preference && styles.selectedAppearance,
            ]}
            onPress={() => setPreference(id)}
          >
            <Text style={styles.appearanceText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ProfileSettings({ user }: { user: Account }) {
  const { refresh, saveOnboarding, signOut } = useSession();
  const action = useAccountAction();
  const logout = useAccountAction();
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
  const displayName = user.profile.displayName.trim();
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase('es-CO');

  return (
    <>
      <View style={[s.section, styles.identity]}>
        {!!initials && (
          <View style={styles.avatar} aria-hidden>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.identityDetails}>
          {!!displayName && <Text style={styles.name}>{displayName}</Text>}
          <Text style={s.text}>{user.email}</Text>
          <Text style={styles.eligibility}>
            {user.synthetic
              ? 'Cuenta de pruebas'
              : eligibilityLabels[user.eligibility.status]}
          </Text>
          {user.eligibility.status === 'DECLARED' && (
            <Text style={s.text}>
              El acceso por dominio declarado no acredita tu matrícula.
              {user.emailVerified
                ? ' Tu correo se confirmó previamente.'
                : ' La titularidad de tu correo está sin verificar.'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingsGrid}>
        <View style={[s.section, styles.settingsCard]}>
          <Text role="heading" aria-level={2} style={s.title}>
            Tu cuenta
          </Text>
          <Field control={control} name="displayName" label="Nombre visible" />
          <AccountFeedback error={save.error?.message}>
            {save.isSuccess ? 'Nombre actualizado.' : null}
          </AccountFeedback>
          <View style={styles.primaryAction}>
            <Button
              title="Guardar nombre"
              disabled={save.isPending}
              onPress={() => {
                void handleSubmit((value) => save.mutate(value))();
              }}
            />
          </View>
        </View>
        <View style={[s.section, styles.settingsCard]}>
          <Text role="heading" aria-level={2} style={s.title}>
            Movilidad
          </Text>
          <View style={styles.linkList}>
            <Link href="/mobility" style={styles.settingLink}>
              Preferencias de movilidad
            </Link>
            <Link href="/mobility-statistics" style={styles.settingLink}>
              Estadísticas de movilidad
            </Link>
            <Link href="/economic-history" style={styles.settingLink}>
              Historial económico
            </Link>
          </View>
        </View>
        <View style={[s.section, styles.settingsCard]}>
          <Text role="heading" aria-level={2} style={s.title}>
            Conducción
          </Text>
          {user.capabilities.driverAccess ? (
            <>
              <Text style={s.text}>
                {user.capabilities.driver
                  ? 'Puedes publicar viajes.'
                  : 'Revisa tu licencia y el estado de los documentos de tu vehículo antes de publicar.'}
              </Text>
              <View style={styles.linkList}>
                <Link href="/vehicles" style={styles.settingLink}>
                  {user.capabilities.driver
                    ? 'Vehículos y licencia'
                    : 'Completar configuración de conductor'}
                </Link>
                <Link href="/my-trips" style={styles.settingLink}>
                  Mis viajes publicados
                </Link>
                {user.capabilities.driver && (
                  <Link href="/publish" style={styles.settingLink}>
                    Publicar viaje
                  </Link>
                )}
              </View>
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
            <View style={styles.primaryAction}>
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
            </View>
          )}
          <AccountFeedback error={action.error} />
        </View>
        <View style={[s.section, styles.settingsCard]}>
          <Text role="heading" aria-level={2} style={s.title}>
            Tu reputación
          </Text>
          {reputation.isPending && (
            <Text style={s.text}>Consultando reputación…</Text>
          )}
          {reputation.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {reputation.error.message}
            </Text>
          )}
          {reputation.data?.map((summary) => (
            <ReputationLabel key={summary.capacity} summary={summary} />
          ))}
          <Link href="/ratings" style={styles.settingLink}>
            Mi reputación y calificaciones
          </Link>
        </View>
        <AppearanceSettings />
        <View style={[s.section, styles.settingsCard]}>
          <Text role="heading" aria-level={2} style={s.title}>
            Avisos
          </Text>
          <Link href="/notification-settings" style={styles.settingLink}>
            Preferencias de avisos
          </Link>
        </View>
        <View style={[s.section, styles.settingsCard]}>
          <Text role="heading" aria-level={2} style={s.title}>
            Seguridad y privacidad
          </Text>
          <View style={styles.linkList}>
            <Link href="/incidents" style={styles.settingLink}>
              Mis incidencias
            </Link>
            <Link href="/account-settings" style={styles.settingLink}>
              Configuración · Cuenta y privacidad
            </Link>
            <Link href="/privacy" style={styles.settingLink}>
              Privacidad y condiciones de uso
            </Link>
          </View>
        </View>
        {user.capabilities.passenger && (
          <View style={styles.settingsCard}>
            <EmergencyContactSettings userId={user.id} />
          </View>
        )}
      </View>
      <View style={styles.session}>
        <AccountFeedback error={logout.error} />
        <Button
          title="Cerrar sesión"
          secondary
          disabled={logout.busy}
          onPress={() => {
            void logout.run(signOut);
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
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identityDetails: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.selected,
  },
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  eligibility: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  settingsCard: { flexBasis: 300, minWidth: 0, flexGrow: 1, flexShrink: 1 },
  linkList: { gap: 1 },
  settingLink: {
    color: colors.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  primaryAction: { alignSelf: 'flex-start', maxWidth: '100%' },
  appearanceChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  appearanceChoice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  selectedAppearance: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  appearanceText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  session: { alignItems: 'flex-start', gap: 10 },
});
