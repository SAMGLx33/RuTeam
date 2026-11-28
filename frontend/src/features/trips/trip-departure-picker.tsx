import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { Pressable, Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';

export const colombiaDay = (offset = 0) =>
  new Date(Date.now() - 5 * 3600_000 + offset * 86400_000)
    .toISOString()
    .slice(0, 10);
const two = (n: number) => String(n).padStart(2, '0');

export function TripDeparturePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [day, time = '08:00'] = value.split(' ');
  const [hour, minute] = time.split(':');
  const [mode, setMode] = useState<'date' | 'time'>();
  const [month, setMonth] = useState(day.slice(0, 7));
  const today = colombiaDay();
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const dayCount = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const spacing = (start.getUTCDay() + 6) % 7;
  const move = (offset: number) =>
    setMonth(
      new Date(Date.UTC(year, monthIndex - 1 + offset, 1))
        .toISOString()
        .slice(0, 7),
    );
  const choose = (date: string) => {
    onChange(date + ' ' + time);
    setMode(undefined);
  };
  return (
    <View style={s.section}>
      <Text style={s.title}>Fecha y hora · Colombia</Text>
      <View style={styles.row}>
        <Button title="Hoy" secondary onPress={() => choose(today)} />
        <Button
          title="Mañana"
          secondary
          onPress={() => choose(colombiaDay(1))}
        />
        <Button
          title="Otra fecha"
          secondary
          onPress={() => setMode(mode === 'date' ? undefined : 'date')}
        />
      </View>
      {mode === 'date' && (
        <View style={s.section}>
          <View style={styles.row}>
            <Button
              title="Mes anterior"
              secondary
              disabled={month <= today.slice(0, 7)}
              onPress={() => move(-1)}
            />
            <Text style={s.text}>
              {start.toLocaleDateString('es-CO', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </Text>
            <Button title="Mes siguiente" secondary onPress={() => move(1)} />
          </View>
          <View style={styles.calendar}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
              <Text key={label} style={styles.day}>
                {label}
              </Text>
            ))}
            {Array.from({ length: spacing }, (_, index) => (
              <View key={'space' + index} style={styles.day} />
            ))}
            {Array.from({ length: dayCount }, (_, index) => {
              const date = month + '-' + two(index + 1);
              return (
                <Pressable
                  key={date}
                  role="button"
                  accessibilityLabel={date}
                  disabled={date < today}
                  accessibilityState={{
                    selected: date === day,
                    disabled: date < today,
                  }}
                  style={[styles.day, date === day && styles.selected]}
                  onPress={() => choose(date)}
                >
                  <Text style={date < today ? styles.muted : undefined}>
                    {index + 1}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <Button
        secondary
        title={'Hora de salida · ' + time}
        onPress={() => setMode(mode === 'time' ? undefined : 'time')}
      />
      {mode === 'time' && (
        <>
          <View style={styles.row}>
            {['Horas', 'Minutos'].map((label, column) => (
              <View key={label} style={styles.column}>
                <Text style={s.text}>{label}</Text>
                <ScrollView nestedScrollEnabled style={{ height: 150 }}>
                  {Array.from({ length: column ? 60 : 24 }, (_, n) => {
                    const text = two(n);
                    const selected = text === (column ? minute : hour);
                    return (
                      <Pressable
                        key={text}
                        role="button"
                        accessibilityLabel={label + ' ' + text}
                        accessibilityState={{ selected }}
                        style={[styles.unit, selected && styles.selected]}
                        onPress={() =>
                          onChange(
                            day +
                              ' ' +
                              (column
                                ? hour + ':' + text
                                : text + ':' + minute),
                          )
                        }
                      >
                        <Text>{text}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
          <Button
            secondary
            title="Confirmar hora"
            onPress={() => setMode(undefined)}
          />
        </>
      )}
      <Text style={s.text}>
        {new Date(day + 'T12:00:00-05:00').toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Bogota',
        })}{' '}
        · {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 360 },
  day: {
    width: '14.28%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: colors.ink,
  },
  column: { flex: 1, alignItems: 'stretch', gap: 4 },
  unit: { minHeight: 40, padding: 8, alignItems: 'center' },
  selected: { backgroundColor: colors.selected, borderRadius: 8 },
  muted: { color: colors.muted },
});
