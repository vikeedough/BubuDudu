import { useListStore } from "@/stores/ListStore";
import { resetAllStores } from "@/tests/helpers/resetStores";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { queueFrom, queueFromSingle, supabaseMock } from "@/tests/mocks/supabase";

const LIST_A = {
  id: "l1",
  type: "Todo",
  content: "Buy milk",
  last_updated_at: "2026-03-06T00:00:00.000Z",
  space_id: "space-1",
};

describe("stores/ListStore", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("does not fetch when already loading", async () => {
    useListStore.setState({ isLoadingLists: true });

    await useListStore.getState().fetchLists();

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("does not fetch when no space id", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    await useListStore.getState().fetchLists();

    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(useListStore.getState().lists).toEqual([]);
  });

  it("fetches lists successfully", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("lists", "select", { data: [LIST_A], error: null });

    await useListStore.getState().fetchLists();

    expect(useListStore.getState().lists).toEqual([LIST_A]);
    expect(useListStore.getState().isLoadingLists).toBe(false);
  });

  it("handles local draft lifecycle", () => {
    const store = useListStore.getState();

    store.openDraft();
    expect(useListStore.getState().isDraftOpen).toBe(true);

    store.updateDraft({ type: "Ideas" });
    store.updateDraft({ content: "Trip plan" });

    expect(useListStore.getState().draft).toEqual({
      type: "Ideas",
      content: "Trip plan",
    });

    store.closeDraft();
    expect(useListStore.getState().draft).toBeNull();
    expect(useListStore.getState().isDraftOpen).toBe(false);
  });

  it("adds a list and prepends it", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("lists", "insert", { data: LIST_A, error: null });

    useListStore.getState().openDraft();
    const created = await useListStore.getState().addList("Todo", "Buy milk");

    expect(created).toEqual(LIST_A);
    expect(useListStore.getState().lists[0]).toEqual(LIST_A);
    expect(useListStore.getState().isDraftOpen).toBe(false);
    expect(useListStore.getState().draft).toBeNull();
  });

  it("updates and reorders an existing list", async () => {
    queueFrom("lists", "update", { data: null, error: null });
    useListStore.setState({
      lists: [
        LIST_A,
        {
          ...LIST_A,
          id: "l2",
          type: "Ideas",
          content: "Old",
        },
      ],
    });

    await useListStore
      .getState()
      .updateList("l2", "Ideas", "Updated content");

    const [first] = useListStore.getState().lists;
    expect(first.id).toBe("l2");
    expect(first.content).toBe("Updated content");
  });

  it("deletes a list from state", async () => {
    queueFrom("lists", "delete", { data: null, error: null });
    useListStore.setState({ lists: [LIST_A] });

    await useListStore.getState().deleteList("l1");

    expect(useListStore.getState().lists).toEqual([]);
  });
});
