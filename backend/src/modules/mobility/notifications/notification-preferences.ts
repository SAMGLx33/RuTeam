import type { NotificationPreferences } from '@ruteam/contracts';

const noticeKinds: Record<keyof NotificationPreferences, string[]> = {
  recommendations: ['TRIP_MATCH'],
  messages: ['CHAT_MESSAGE'],
  reminders: ['RATING_AVAILABLE'],
  recurrences: [
    'OCCURRENCE_PUBLISHED',
    'RECURRENCE_PAUSED',
    'OCCURRENCE_FAILED',
  ],
  optionalTripUpdates: ['PASSENGER_JOINED', 'PICKUP_PROPOSED'],
};

export function notificationPreferences(
  stored: unknown,
): NotificationPreferences {
  const values = (stored ?? {}) as Partial<NotificationPreferences>;
  return {
    recommendations: values.recommendations !== false,
    messages: values.messages !== false,
    reminders: values.reminders !== false,
    recurrences: values.recurrences !== false,
    optionalTripUpdates: values.optionalTripUpdates !== false,
  };
}
export function suppressedNotices(stored: unknown) {
  const preferences = notificationPreferences(stored);
  return (
    Object.keys(preferences) as (keyof NotificationPreferences)[]
  ).flatMap((category) => (preferences[category] ? [] : noticeKinds[category]));
}
