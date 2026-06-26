import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { usersApi } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await usersApi.updateProfile({ fcmToken: tokenData.data });
  } catch {
    // Non-fatal — push won't work but app still functions
  }
}

export function setupNotificationListeners(
  onTap: (data: any) => void,
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    onTap(data);
  });
  return () => sub.remove();
}
