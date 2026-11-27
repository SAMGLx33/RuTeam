import { useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text } from 'react-native';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import type { BoardingCameraProps } from './boarding-camera';

export function BoardingCamera({ onScan }: BoardingCameraProps) {
  const [permission, request] = useCameraPermissions();
  const [failed, setFailed] = useState(false);
  if (failed || (permission && !permission.granted && !permission.canAskAgain))
    return (
      <Text accessibilityRole="alert" style={s.error}>
        Cámara no disponible. Puedes confirmar el abordaje manualmente.
      </Text>
    );
  if (!permission)
    return <Text style={s.text}>Consultando permiso de cámara…</Text>;
  if (!permission.granted)
    return (
      <Button
        title="Permitir cámara para leer QR"
        onPress={() => {
          void request().catch(() => setFailed(true));
        }}
      />
    );
  return (
    <CameraView
      style={styles.camera}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => onScan(data)}
      onMountError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  camera: { width: '100%', height: 240, overflow: 'hidden', borderRadius: 10 },
});
