import { useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';
import { Button } from '../../components/ui/button';
import { useAppearance } from '../../theme/appearance';
import { ScrollView, Text, View } from '../../theme/primitives';
import { AccountField } from './login-screen';
import names from './phone-country-names.json';

const countries = getCountries()
  .map((id) => ({
    id,
    name: names[id],
    prefix: '+' + getCountryCallingCode(id),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'es'));
const colombia = countries.find(({ id }) => id === 'CO')!;
const searchKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const flag = (id: CountryCode) =>
  String.fromCodePoint(
    ...Array.from(id, (letter) => 127397 + letter.charCodeAt(0)),
  );

export function isPossibleRecoveryPhone(value: string) {
  return (
    /^\+[1-9]\d{7,14}$/.test(value) &&
    parsePhoneNumberFromString(value, { extract: false })?.isPossible() === true
  );
}

export function PhoneNumberField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { palette } = useAppearance();
  const [selected, setSelected] = useState(() => {
    const parsed = parsePhoneNumberFromString(value);
    return (
      countries.find(({ id }) => id === parsed?.country) ??
      countries.find(
        ({ prefix }) => prefix === '+' + parsed?.countryCallingCode,
      ) ??
      colombia
    );
  });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const national = value.startsWith(selected.prefix)
    ? value.slice(selected.prefix.length)
    : '';
  const search = searchKey(query.trim());
  const matches = countries.filter(
    ({ name, prefix }) =>
      searchKey(name).includes(search) || prefix.includes(search),
  );

  function updateNumber(input: string) {
    const text = input.trim();
    const digits = text.replace(/\D/g, '');
    if (text.startsWith('+') || text.startsWith('00')) {
      const international =
        '+' + (text.startsWith('00') ? digits.slice(2) : digits);
      const parsed = parsePhoneNumberFromString(international, {
        extract: false,
      });
      const choice =
        countries.find(({ id }) => id === parsed?.country) ??
        (international.startsWith(selected.prefix)
          ? selected
          : countries.find(({ prefix }) => international.startsWith(prefix)));
      if (!choice) return;
      setSelected(choice);
      onChange(parsed?.number ?? international);
      return;
    }
    onChange(selected.prefix + digits);
  }

  return (
    <>
      <View style={styles.row}>
        <Button
          title={`${flag(selected.id)} ${selected.name} ${selected.prefix} ▾`}
          secondary
          disabled={disabled}
          onPress={() => {
            setQuery('');
            setOpen(true);
          }}
        />
        <View style={styles.number}>
          <AccountField
            label="Número nacional"
            keyboardType="phone-pad"
            autoComplete="tel-national"
            value={national}
            editable={!disabled}
            onChangeText={updateNumber}
          />
        </View>
      </View>
      {national.length > 0 && !isPossibleRecoveryPhone(value) && (
        <Text style={{ color: palette.ink }}>
          Comprueba la longitud del teléfono para el prefijo seleccionado.
        </Text>
      )}
      {open && (
        <Modal
          visible
          onRequestClose={() => setOpen(false)}
          transparent
          animationType="none"
        >
          <View style={styles.overlay}>
            <View
              accessibilityViewIsModal
              style={[styles.panel, { backgroundColor: palette.surface }]}
            >
              <AccountField
                label="Buscar país o prefijo"
                value={query}
                onChangeText={setQuery}
              />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.countries}
              >
                {matches.map((country) => (
                  <Button
                    key={country.id}
                    title={`${flag(country.id)} ${country.name} ${country.prefix}`}
                    secondary={country.id !== selected.id}
                    onPress={() => {
                      setSelected(country);
                      onChange(country.prefix + national);
                      setOpen(false);
                    }}
                  />
                ))}
                {matches.length === 0 && (
                  <Text style={{ color: palette.ink }}>
                    Sin países para esa búsqueda.
                  </Text>
                )}
              </ScrollView>
              <Button
                title="Cerrar selector de país"
                secondary
                onPress={() => setOpen(false)}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 8,
  },
  number: { flex: 1, minWidth: 145 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0008',
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  countries: { maxHeight: 340 },
});
