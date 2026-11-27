import { useState } from 'react';
import { Linking, Switch, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EmergencyContact,
  EmergencyContactInput,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { colors } from '../../theme/tokens';
import { api } from '../../services/api/client';

const path = '/me/emergency-contacts';
const blank: EmergencyContactInput = {
  name: '',
  phone: '',
  relationship: null,
  available: true,
};

function useEmergencyContacts(userId: string) {
  return useQuery({
    queryKey: ['emergency-contacts', userId],
    queryFn: ({ signal }) => api<EmergencyContact[]>(path, { signal }),
    gcTime: 0,
  });
}

const inputStyle = {
  minHeight: 48,
  borderWidth: 1,
  borderRadius: 8,
  borderColor: colors.border,
  color: colors.ink,
  padding: 10,
};

export function EmergencyContactSettings({ userId }: { userId: string }) {
  const query = useEmergencyContacts(userId);
  const client = useQueryClient();
  const [editing, setEditing] = useState<{
    id?: string;
    values: EmergencyContactInput;
  }>();
  const [deleting, setDeleting] = useState<string>();
  const save = useMutation({
    mutationFn: ({ id, values }: NonNullable<typeof editing>) =>
      api<EmergencyContact>(id ? `${path}/${id}` : path, {
        method: id ? 'PUT' : 'POST',
        body: { ...values, relationship: values.relationship?.trim() || null },
      }),
    onSuccess: () => {
      setEditing(undefined);
      return client.invalidateQueries({
        queryKey: ['emergency-contacts', userId],
      });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api<void>(`${path}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleting(undefined);
      return client.invalidateQueries({
        queryKey: ['emergency-contacts', userId],
      });
    },
  });
  const pending = save.isPending || remove.isPending;
  return (
    <View style={s.section}>
      <Text style={s.title}>Contactos de emergencia</Text>
      <Text style={s.text}>
        Guarda personas de confianza para acceder a su teléfono durante un
        viaje.
      </Text>
      {query.isPending && (
        <Text style={s.text}>Consultando tus contactos…</Text>
      )}
      {(query.error || save.error || remove.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error?.message ?? save.error?.message ?? remove.error?.message}
        </Text>
      )}
      {query.data?.length === 0 && (
        <Text style={s.text}>Aún no tienes contactos.</Text>
      )}
      {query.data?.map(({ id, ...values }) => (
        <View key={id} style={s.section}>
          <Text style={s.text}>
            {values.name} · {values.phone} ·{' '}
            {values.available ? 'Disponible' : 'No disponible'}
          </Text>
          {values.relationship && (
            <Text style={s.text}>{values.relationship}</Text>
          )}
          {deleting === id ? (
            <>
              <Button
                title="Confirmar eliminación del contacto"
                disabled={pending}
                onPress={() => remove.mutate(id)}
              />
              <Button
                title="Conservar contacto"
                secondary
                disabled={pending}
                onPress={() => setDeleting(undefined)}
              />
            </>
          ) : (
            <>
              <Button
                title={`Editar a ${values.name}`}
                secondary
                disabled={pending}
                onPress={() => {
                  save.reset();
                  setDeleting(undefined);
                  setEditing({ id, values });
                }}
              />
              <Button
                title={`Eliminar a ${values.name}`}
                secondary
                disabled={pending}
                onPress={() => {
                  remove.reset();
                  setEditing(undefined);
                  setDeleting(id);
                }}
              />
            </>
          )}
        </View>
      ))}
      {editing ? (
        <View style={s.section}>
          {(
            [
              ['name', 'Nombre o alias', 80],
              ['phone', 'Teléfono', 16],
              ['relationship', 'Relación (opcional)', 40],
            ] as const
          ).map(([field, label, limit]) => (
            <View key={field}>
              <Text style={s.text}>{label}</Text>
              <TextInput
                style={inputStyle}
                accessibilityLabel={label}
                inputMode={field === 'phone' ? 'tel' : 'text'}
                value={editing.values[field] ?? ''}
                maxLength={limit}
                editable={!pending}
                onChangeText={(value) =>
                  setEditing(
                    (current) =>
                      current && {
                        ...current,
                        values: { ...current.values, [field]: value },
                      },
                  )
                }
              />
            </View>
          ))}
          <Text style={s.text}>Disponible durante el viaje</Text>
          <Switch
            accessibilityLabel="Contacto disponible durante el viaje"
            value={editing.values.available}
            disabled={pending}
            onValueChange={(available) =>
              setEditing({
                ...editing,
                values: { ...editing.values, available },
              })
            }
          />
          <Button
            title="Guardar contacto"
            disabled={
              pending ||
              !editing.values.name.trim() ||
              !/^\+?[0-9]{7,15}$/.test(editing.values.phone.trim())
            }
            onPress={() => save.mutate(editing)}
          />
          <Button
            title="Cerrar edición"
            secondary
            disabled={pending}
            onPress={() => setEditing(undefined)}
          />
        </View>
      ) : (
        !!query.data &&
        query.data.length < 10 && (
          <Button
            title="Añadir contacto"
            secondary
            disabled={pending}
            onPress={() => {
              save.reset();
              setDeleting(undefined);
              setEditing({ values: blank });
            }}
          />
        )
      )}
    </View>
  );
}

export function TripEmergencyContacts({ userId }: { userId: string }) {
  const contacts = useEmergencyContacts(userId);
  const [selectedId, setSelectedId] = useState<string>();
  const [error, setError] = useState('');
  const available = contacts.isError
    ? []
    : (contacts.data?.filter(({ available }) => available) ?? []);
  const selected = available.find(({ id }) => id === selectedId);
  return (
    <View style={s.section}>
      <Text style={s.title}>Personas de confianza</Text>
      {contacts.isPending && (
        <Text style={s.text}>Consultando tus contactos…</Text>
      )}
      {contacts.isError && (
        <Text accessibilityRole="alert" style={s.error}>
          No pudimos consultar tus contactos.
        </Text>
      )}
      {contacts.data && !contacts.isError && !available.length && (
        <Text style={s.text}>
          Puedes configurar contactos disponibles en tu perfil.
        </Text>
      )}
      {selected ? (
        <>
          <Text style={s.text}>
            Abrir el marcador con el teléfono de {selected.name} ·{' '}
            {selected.phone}.
          </Text>
          <Button
            title="Confirmar y abrir marcador"
            onPress={() => {
              setError('');
              void Linking.openURL(`tel:${selected.phone}`).catch(() =>
                setError('El marcador no está disponible en este dispositivo.'),
              );
            }}
          />
          <Button
            title="Volver a mis contactos"
            secondary
            onPress={() => {
              setSelectedId(undefined);
              setError('');
            }}
          />
        </>
      ) : (
        available.map(({ id, name }) => (
          <Button
            key={id}
            title={`Contactar a ${name}`}
            secondary
            onPress={() => setSelectedId(id)}
          />
        ))
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
