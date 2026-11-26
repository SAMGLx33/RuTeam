import type { ComponentType } from 'react';
import { Text } from 'react-native';
import { formStyles as s } from '../../components/ui/protected-page';

export interface BoardingCameraProps {
  onScan: (code: string) => void;
}

export const BoardingCamera: ComponentType<BoardingCameraProps> = () => {
  return <Text style={s.text}>Usa el abordaje manual en este navegador.</Text>;
};
