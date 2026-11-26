import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import qrcode from 'qrcode-generator';
import type { BoardingPass, ReservationView } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { BoardingCamera } from './boarding-camera';

function BoardingQr({ code }: { code: string }) {
  const { count, runs } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(code);
    qr.make();
    const count = qr.getModuleCount();
    const runs = [];
    for (let row = 0; row < count; row++) {
      let col = 0;
      while (col < count) {
        if (!qr.isDark(row, col)) {
          col++;
          continue;
        }
        const start = col;
        while (col < count && qr.isDark(row, col)) col++;
        runs.push({ row, start, width: col - start });
      }
    }
    return { count, runs };
  }, [code]);
  const cell = 5;
  const size = (count + 8) * cell;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="QR temporal de abordaje de RuTeam"
      style={[styles.qr, { width: size, height: size }]}
    >
      {runs.map(({ row, start, width }) => (
        <View
          key={`${row}:${start}`}
          style={[
            styles.pixelRun,
            {
              top: (row + 4) * cell,
              left: (start + 4) * cell,
              width: width * cell,
              height: cell,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function PassengerBoardingPass({
  reservationId,
}: {
  reservationId: string;
}) {
  const [pass, setPass] = useState<BoardingPass | null>(null);
  const expiresAt = pass?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const close = setTimeout(
      () => setPass(null),
      Math.max(0, Date.parse(expiresAt) - Date.now()),
    );
    return () => clearTimeout(close);
  }, [expiresAt]);
  const issue = useMutation({
    mutationFn: () =>
      api<BoardingPass>(`/participations/${reservationId}/boarding-pass`, {
        method: 'POST',
      }),
    onSuccess: setPass,
  });
  return (
    <View style={s.section}>
      {pass ? (
        <>
          <BoardingQr code={pass.code} />
          <Text style={s.text}>
            Muéstralo al conductor en tu recogida. Es personal y dura dos
            minutos.
          </Text>
          <Button
            title="Ocultar QR"
            secondary
            onPress={() => {
              setPass(null);
              issue.reset();
            }}
          />
        </>
      ) : (
        <Button
          title="Mostrar QR de abordaje"
          secondary
          disabled={issue.isPending}
          onPress={() => issue.mutate()}
        />
      )}
      {issue.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {issue.error.message}
        </Text>
      )}
    </View>
  );
}

export function DriverBoardingScanner({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const submitted = useRef(false);
  useFocusEffect(useCallback(() => () => setOpen(false), []));
  useEffect(() => {
    if (!open || Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setOpen(false);
    });
    return () => subscription.remove();
  }, [open]);
  const redeem = useMutation({
    mutationFn: (code: string) =>
      api<ReservationView>(`/trips/${tripId}/boarding-pass/redeem`, {
        method: 'POST',
        body: { code },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['driver-participations', tripId],
      });
      void queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });

  if (Platform.OS === 'web')
    return (
      <Text style={s.text}>
        Puedes confirmar el abordaje manualmente en este navegador.
      </Text>
    );

  return (
    <View style={s.section}>
      {open ? (
        <>
          <Text style={s.text}>
            Enfoca el QR que el pasajero muestra en su cuenta RuTeam.
          </Text>
          <BoardingCamera
            onScan={(code) => {
              if (submitted.current) return;
              if (!/^ruteam-board:v1:[A-Za-z0-9_-]{43}$/.test(code)) {
                setInvalid(true);
                return;
              }
              submitted.current = true;
              setOpen(false);
              redeem.mutate(code);
            }}
          />
          {invalid && (
            <Text accessibilityRole="alert" style={s.error}>
              Escanea el QR de abordaje de RuTeam.
            </Text>
          )}
          <Button
            title="Cerrar cámara"
            secondary
            onPress={() => setOpen(false)}
          />
        </>
      ) : (
        <Button
          title="Escanear QR de abordaje"
          secondary
          disabled={redeem.isPending}
          onPress={() => {
            submitted.current = false;
            setInvalid(false);
            redeem.reset();
            setOpen(true);
          }}
        />
      )}
      {redeem.isSuccess && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          Abordaje confirmado.
        </Text>
      )}
      {redeem.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {redeem.error.message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  qr: { backgroundColor: '#fff', alignSelf: 'center', position: 'relative' },
  pixelRun: { backgroundColor: '#000', position: 'absolute' },
});
