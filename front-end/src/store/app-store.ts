import { create } from "zustand";

import { statusLabel } from "@/lib/job";
import { clearPersistedState, loadPersistedState, savePersistedState } from "@/lib/storage";
import type { AppNotification, JobRecord, SessionUser } from "@/types";

interface PersistedState {
  session?: SessionUser;
  activeProjectId?: string;
}

interface AppState {
  hydrated: boolean;
  isSubmitting: boolean;
  session?: SessionUser;
  activeProjectId?: string;
  currentJob?: JobRecord;
  currentJobId?: string;
  latestReferenceImage?: string;
  notifications: AppNotification[];
  hydrate: () => Promise<void>;
  setActiveProjectId: (projectId?: string) => void;
  setJob: (job?: JobRecord, jobId?: string) => void;
  setLatestReferenceImage: (image?: string) => void;
  setLoading: (loading: boolean) => void;
  pushNotification: (notification: Omit<AppNotification, "id">) => void;
  dismissNotification: (id: string) => void;
  setSession: (session?: SessionUser) => void;
}

async function persistSnapshot(snapshot: PersistedState) {
  await savePersistedState(snapshot);
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  isSubmitting: false,
  notifications: [],
  async hydrate() {
    if (get().hydrated) {
      return;
    }

    try {
      const snapshot = (await loadPersistedState()) as PersistedState | null;
      set({
        hydrated: true,
        session: snapshot?.session,
        activeProjectId: snapshot?.activeProjectId
      });
    } catch {
      set({
        hydrated: true
      });
    }
  },
  setActiveProjectId(activeProjectId) {
    set({ activeProjectId });
    void persistSnapshot({
      session: get().session,
      activeProjectId
    });
  },
  setJob(job, jobId) {
    const previousJob = get().currentJob;
    set({ currentJob: job, currentJobId: jobId });
    if (!job) {
      return;
    }

    if (previousJob?.status === job.status && previousJob?.message === job.message) {
      return;
    }

    const tone =
      job.status === "live"
        ? "success"
        : job.status === "failed"
          ? "error"
          : job.status === "deploying" || job.status === "pushing"
            ? "info"
            : job.status === "queued" || job.status === "generating"
              ? "warning"
              : "info";

    get().pushNotification({
      title: statusLabel(job.status),
      body: job.message,
      tone
    });
  },
  setLatestReferenceImage(latestReferenceImage) {
    set({ latestReferenceImage });
  },
  setLoading(isSubmitting) {
    set({ isSubmitting });
  },
  pushNotification(notification) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      notifications: [
        { ...notification, id },
        ...state.notifications.filter((item) => item.id !== id)
      ].slice(0, 4)
    }));
  },
  dismissNotification(id) {
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    }));
  },
  setSession(session) {
    set({ session });
    void persistSnapshot({
      session,
      activeProjectId: get().activeProjectId
    });
  }
}));

export async function signOut() {
  useAppStore.setState({
    session: undefined,
    activeProjectId: undefined,
    currentJob: undefined,
    currentJobId: undefined,
    latestReferenceImage: undefined,
    notifications: [],
    isSubmitting: false
  });
  await clearPersistedState();
}
