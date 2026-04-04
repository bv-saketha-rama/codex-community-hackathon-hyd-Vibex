import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const APP_STATE_KEY = "vibex.state";
const LEGACY_APP_STATE_KEY = "vibedeploy.state";

function readWebStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWebStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function removeWebStorage(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

async function readPersistedValue(key: string) {
  if (Platform.OS === "web" || typeof window !== "undefined") {
    return readWebStorage(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writePersistedValue(key: string, value: string) {
  if (Platform.OS === "web" || typeof window !== "undefined") {
    writeWebStorage(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    writeWebStorage(key, value);
  }
}

async function removePersistedValue(key: string) {
  if (Platform.OS === "web" || typeof window !== "undefined") {
    removeWebStorage(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    removeWebStorage(key);
  }
}

export async function loadPersistedState() {
  const raw = await readPersistedValue(APP_STATE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const legacyRaw = await readPersistedValue(LEGACY_APP_STATE_KEY);
  if (!legacyRaw) {
    return null;
  }

  try {
    return JSON.parse(legacyRaw);
  } catch {
    return null;
  }
}

export async function savePersistedState(state: unknown) {
  await writePersistedValue(APP_STATE_KEY, JSON.stringify(state));
}

export async function clearPersistedState() {
  await removePersistedValue(APP_STATE_KEY);
  await removePersistedValue(LEGACY_APP_STATE_KEY);
}
