import { Alert, Linking } from 'react-native';
import appVersion from '../appVersion.json';

const VERSION_URL = 'http://72.60.89.132:4417/taxiapp-version.json';

export async function checkForUpdate() {
  try {
    const res = await fetch(VERSION_URL, { method: 'GET' });
    if (!res.ok) return;
    const remote = await res.json();
    if (typeof remote.versionCode !== 'number') return;
    if (remote.versionCode <= appVersion.versionCode) return;

    Alert.alert(
      'Update available',
      `A new version of TaxiApp is ready (v${remote.versionName ?? remote.versionCode}).`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Update now', onPress: () => Linking.openURL(remote.url) },
      ],
    );
  } catch {
    // No connectivity or the update server is unreachable — never block app launch on this.
  }
}
