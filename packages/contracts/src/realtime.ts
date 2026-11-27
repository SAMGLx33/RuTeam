export type RealtimeSignal =
  | { kind: 'READY' | 'PING' | 'SESSION_ENDED' | 'FEED' | 'PERSON' }
  | { kind: 'TRIP' | 'CHAT' | 'TRACKING'; tripId: string };
