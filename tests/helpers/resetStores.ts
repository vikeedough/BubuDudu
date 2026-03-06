import { useGalleryStore } from "@/stores/GalleryStore";
import { useListStore } from "@/stores/ListStore";
import { useMilestoneStore } from "@/stores/MilestoneStore";
import { useToastStore } from "@/stores/ToastStore";
import { useWheelStore } from "@/stores/WheelStore";

export function resetAllStores() {
  useToastStore.setState({ order: [], byId: {} });

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

  useGalleryStore.getState().clear();
}
