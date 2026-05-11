import { useGalleryStore } from "@/stores/GalleryStore";
import { useExpenseStore } from "@/stores/ExpenseStore";
import { useListStore } from "@/stores/ListStore";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { useSyncStore } from "@/stores/SyncStore";
import { useToastStore } from "@/stores/ToastStore";
import { useWheelStore } from "@/stores/WheelStore";
import { setIsOnline } from "@/utils/offline/network";

export function resetAllStores() {
  setIsOnline(true);
  useToastStore.setState({ order: [], byId: {} });
  useSyncStore.setState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });

  useListStore.setState({
    lists: [],
    isLoadingLists: false,
    draft: null,
    isDraftOpen: false,
  });

  useWheelStore.setState({
    wheels: [],
    isLoadingWheels: false,
    draft: null,
    isDraftOpen: false,
  });

  useMilestoneStore.setState({
    milestone: null,
    isLoading: false,
    error: null,
  });

  useExpenseStore.getState().clear();
  useGalleryStore.getState().clear();
}
