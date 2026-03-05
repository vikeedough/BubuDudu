import { useWheelStore } from "@/stores/WheelStore";
import { resetAllStores } from "@/tests/helpers/resetStores";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { queueFrom, queueFromSingle, supabaseMock } from "@/tests/mocks/supabase";

const WHEEL_A = {
  id: "w1",
  title: "Dinner",
  choices: ["Pasta", "Sushi"],
  created_at: "2026-03-06T00:00:00.000Z",
  space_id: "space-1",
};

describe("stores/WheelStore", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("does not fetch when already loading", async () => {
    useWheelStore.setState({ isLoadingWheels: true });

    await useWheelStore.getState().fetchWheels();

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("does not fetch when no space id", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    await useWheelStore.getState().fetchWheels();

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("fetches wheels successfully", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("wheel", "select", { data: [WHEEL_A], error: null });

    await useWheelStore.getState().fetchWheels();

    expect(useWheelStore.getState().wheels).toEqual([WHEEL_A]);
    expect(useWheelStore.getState().isLoadingWheels).toBe(false);
  });

  it("handles local draft lifecycle", () => {
    const store = useWheelStore.getState();

    store.openDraft();
    expect(useWheelStore.getState().isDraftOpen).toBe(true);

    store.updateDraft({ title: "Movie" });
    store.updateDraft({ choices: ["A", "B"] });

    expect(useWheelStore.getState().draft).toEqual({
      title: "Movie",
      choices: ["A", "B"],
    });

    store.closeDraft();
    expect(useWheelStore.getState().draft).toBeNull();
    expect(useWheelStore.getState().isDraftOpen).toBe(false);
  });

  it("adds a wheel and prepends it", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("wheel", "insert", { data: WHEEL_A, error: null });

    useWheelStore.getState().openDraft();
    const created = await useWheelStore
      .getState()
      .addWheel("Dinner", ["Pasta", "Sushi"]);

    expect(created).toEqual(WHEEL_A);
    expect(useWheelStore.getState().wheels[0]).toEqual(WHEEL_A);
    expect(useWheelStore.getState().isDraftOpen).toBe(false);
    expect(useWheelStore.getState().draft).toBeNull();
  });

  it("updates wheel title without changing item count", async () => {
    queueFrom("wheel", "update", { data: null, error: null });
    useWheelStore.setState({ wheels: [WHEEL_A] });

    await useWheelStore.getState().updateWheelTitle("w1", "Lunch");

    expect(useWheelStore.getState().wheels).toHaveLength(1);
    expect(useWheelStore.getState().wheels[0].title).toBe("Lunch");
  });

  it("updates wheel choices", async () => {
    queueFrom("wheel", "update", { data: null, error: null });
    useWheelStore.setState({ wheels: [WHEEL_A] });

    await useWheelStore.getState().updateWheelChoices("w1", ["Ramen"]);

    expect(useWheelStore.getState().wheels[0].choices).toEqual(["Ramen"]);
  });

  it("deletes a wheel from state", async () => {
    queueFrom("wheel", "delete", { data: null, error: null });
    useWheelStore.setState({ wheels: [WHEEL_A] });

    await useWheelStore.getState().deleteWheel("w1");

    expect(useWheelStore.getState().wheels).toEqual([]);
  });
});
