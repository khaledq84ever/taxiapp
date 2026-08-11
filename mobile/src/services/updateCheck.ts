import { AppState, Platform, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// SDK 56 moved the promise-based download/cacheDirectory API (used here) to
// the "legacy" entrypoint — the new default export is a File/Directory class
// API that doesn't have downloadAsync/getContentUriAsync in this shape.
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import appVersion from '../appVersion.json';

// Same shape/host as KDL's self-update: the APK server hosts a small JSON
// file (versionCode, versionName, url) next to the APK itself, updated by
// the release/build step every time a new APK is published. If the phone's
// installed versionCode is behind, the new APK is pulled down in-app and the
// system installer is launched directly — no browser download, no manual
// "open the .apk from Downloads" step. See ~/kdl-app MainActivity.checkUpdate
// / autoUpdate for the reference implementation this mirrors.
const VERSION_URL = 'http://72.60.89.132:4417/taxiapp-version.json';
const CHECK_THROTTLE_MS = 60_000; // matches KDL: cold start always checks, resume is throttled
const CACHE_VC_KEY = 'update_cached_vc';
const CACHE_PATH_KEY = 'update_cached_path';

let checking = false;
let lastCheck = 0;

function myVersionCode(): number {
  // The real installed versionCode (what Android actually thinks this build
  // is) beats the bundled appVersion.json, which only reflects whatever was
  // true when the JS bundle was last built — the native shell is the source
  // of truth for "am I actually behind".
  const native = Platform.OS === 'android' ? Number(Application.nativeBuildVersion) : NaN;
  return Number.isFinite(native) && native > 0 ? native : appVersion.versionCode;
}

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

// force=true bypasses the resume throttle — used for the cold-start check.
export async function checkForUpdate(force = false) {
  if (Platform.OS !== 'android') return; // silent in-app installer is Android-only
  if (checking) return;
  if (!force && Date.now() - lastCheck < CHECK_THROTTLE_MS) return;
  checking = true;
  try {
    const res = await fetch(VERSION_URL);
    if (!res.ok) return;
    const remote = await res.json();
    lastCheck = Date.now();
    if (typeof remote.versionCode !== 'number' || !remote.url) return;
    if (remote.versionCode <= myVersionCode()) return;
    await downloadAndInstall(remote);
  } catch {
    // offline or the update server is unreachable — never block app launch
  } finally {
    checking = false;
  }
}

async function downloadAndInstall(remote: {
  versionCode: number;
  versionName?: string;
  url: string;
}) {
  try {
    // Already pulled this exact build on an earlier launch (e.g. the user
    // dismissed the installer or backgrounded mid-tap) — go straight back to
    // the installer instead of re-downloading the whole APK.
    const cachedVc = Number(await AsyncStorage.getItem(CACHE_VC_KEY));
    const cachedPath = await AsyncStorage.getItem(CACHE_PATH_KEY);
    if (cachedVc === remote.versionCode && cachedPath) {
      const info = await FileSystem.getInfoAsync(cachedPath);
      if (info.exists && info.size > 0) {
        await promptInstall(cachedPath);
        return;
      }
    }

    const dest = FileSystem.cacheDirectory + 'taxiapp-update.apk';
    await FileSystem.deleteAsync(dest, { idempotent: true });
    toast(`Downloading update v${remote.versionName ?? remote.versionCode}…`);
    const result = await FileSystem.downloadAsync(remote.url, dest);
    if (result.status !== 200) return;

    await AsyncStorage.setItem(CACHE_VC_KEY, String(remote.versionCode));
    await AsyncStorage.setItem(CACHE_PATH_KEY, dest);
    await promptInstall(dest);
  } catch {
    // network hiccup mid-download — silently give up, next launch retries
  }
}

async function promptInstall(fileUri: string) {
  try {
    // A file:// Uri would crash the installer on modern Android — hand out a
    // content:// Uri via expo-file-system's own FileProvider instead.
    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
      flags: 1 | 268435456,
      type: 'application/vnd.android.package-archive',
    });
    // If "install unknown apps" isn't granted for TaxiApp yet, Android's own
    // installer screen asks for it inline — no separate permission dance
    // needed here, unlike a raw PackageInstaller session.
  } catch {
    // installer couldn't be launched — next cold start / resume tries again
  }
}

// Mirrors KDL's onResume: reopening the app (from recents, or back from the
// "allow unknown apps" settings screen) re-checks for an update, throttled
// the same as a cold start so flicking through recents doesn't hammer the
// version endpoint.
AppState.addEventListener('change', (state) => {
  if (state === 'active') checkForUpdate();
});
