import { Link } from '../../theme/primitives';

import { formStyles } from '../../components/ui/protected-page';

export function TripSafetyLink({ tripId }: { tripId: string }) {
  return (
    <Link
      href={{ pathname: '/safety/[tripId]', params: { tripId } }}
      style={formStyles.link}
    >
      Seguridad del viaje
    </Link>
  );
}
