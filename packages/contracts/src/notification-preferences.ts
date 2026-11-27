export interface NotificationPreferences {
  recommendations: boolean;
  messages: boolean;
  reminders: boolean;
  recurrences: boolean;
  optionalTripUpdates: boolean;
}
export interface NotificationSettings {
  preferences: NotificationPreferences;
  nativePushConfigured: boolean;
  devices: { id: string; platform: 'ANDROID' | 'IOS'; registeredAt: string }[];
}
