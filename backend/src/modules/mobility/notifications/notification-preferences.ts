import type { NotificationPreferences } from '@ruteam/contracts';

const noticeKinds: Record<
  Exclude<keyof NotificationPreferences, 'reminderLeadMinutes'>,
  string[]
> = {
  recommendations: ['TRIP_MATCH'],
  messages: ['CHAT_MESSAGE'],
  reminders: [
    'RATING_AVAILABLE',
    'TRIP_DEPARTURE_REMINDER',
    'TRIP_PICKUP_REMINDER',
    'PICKUP_CONFIRMATION_REMINDER',
    'DRIVING_DOCUMENT_REMINDER',
  ],
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
    reminderLeadMinutes:
      values.reminderLeadMinutes === 15 || values.reminderLeadMinutes === 60
        ? values.reminderLeadMinutes
        : 30,
    recurrences: values.recurrences !== false,
    optionalTripUpdates: values.optionalTripUpdates !== false,
  };
}
export function suppressedNotices(stored: unknown) {
  const preferences = notificationPreferences(stored);
  return (Object.keys(noticeKinds) as (keyof typeof noticeKinds)[]).flatMap(
    (category) => (preferences[category] ? [] : noticeKinds[category]),
  );
}
