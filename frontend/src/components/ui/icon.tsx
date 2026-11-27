import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { useAppearance } from '../../theme/appearance';

export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { palette } = useAppearance();
  return (
    <Feather
      name={name}
      size={size}
      color={color ?? palette.ink}
      accessible={false}
      aria-hidden
    />
  );
}
