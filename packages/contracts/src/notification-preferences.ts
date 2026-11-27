export interface NotificationPreferences {
  recommendations: boolean;
  messages: boolean;
  reminders: boolean;
  reminderLeadMinutes?: 15 | 30 | 60;
  recurrences: boolean;
  optionalTripUpdates: boolean;
}
export interface NotificationSettings {
  preferences: NotificationPreferences;
  nativePushConfigured: boolean;
  devices: { id: string; platform: 'ANDROID' | 'IOS'; registeredAt: string }[];
}
