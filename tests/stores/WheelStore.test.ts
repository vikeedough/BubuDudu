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

  it("throws on fetch error and resets loading state", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFrom("wheel", "select", {
      data: null,
      error: { message: "fetch failed" },
    });

    await expect(useWheelStore.getState().fetchWheels()).rejects.toMatchObject({
      message: "fetch failed",
    });
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

  it("throws when adding wheel without active space", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    await expect(
      useWheelStore.getState().addWheel("Dinner", ["A", "B"]),
    ).rejects.toThrow("No active spaceId");
  });

  it("throws when addWheel insert fails", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("wheel", "insert", {
      data: null,
      error: { message: "insert failed" },
    });

    await expect(
      useWheelStore.getState().addWheel("Dinner", ["A", "B"]),
    ).rejects.toMatchObject({
      message: "insert failed",
    });
  });

  it("updates wheel title without changing item count", async () => {
    queueFrom("wheel", "update", { data: null, error: null });
    useWheelStore.setState({ wheels: [WHEEL_A] });

    await useWheelStore.getState().updateWheelTitle("w1", "Lunch");

    expect(useWheelStore.getState().wheels).toHaveLength(1);
    expect(useWheelStore.getState().wheels[0].title).toBe("Lunch");
  });

  it("throws when updating wheel title fails", async () => {
    queueFrom("wheel", "update", {
      data: null,
      error: { message: "title failed" },
    });

    await expect(
      useWheelStore.getState().updateWheelTitle("w1", "Lunch"),
    ).rejects.toMatchObject({
      message: "title failed",
    });
  });

  it("updates wheel choices", async () => {
    queueFrom("wheel", "update", { data: null, error: null });
    useWheelStore.setState({ wheels: [WHEEL_A] });

    await useWheelStore.getState().updateWheelChoices("w1", ["Ramen"]);

    expect(useWheelStore.getState().wheels[0].choices).toEqual(["Ramen"]);
  });

  it("throws when updating wheel choices fails", async () => {
    queueFrom("wheel", "update", {
      data: null,
      error: { message: "choices failed" },
    });

    await expect(
      useWheelStore.getState().updateWheelChoices("w1", ["Ramen"]),
    ).rejects.toMatchObject({
      message: "choices failed",
    });
  });

  it("deletes a wheel from state", async () => {
    queueFrom("wheel", "delete", { data: null, error: null });
    useWheelStore.setState({ wheels: [WHEEL_A] });

    await useWheelStore.getState().deleteWheel("w1");

    expect(useWheelStore.getState().wheels).toEqual([]);
  });

  it("throws when deleting wheel fails", async () => {
    queueFrom("wheel", "delete", {
      data: null,
      error: { message: "delete failed" },
    });

    await expect(useWheelStore.getState().deleteWheel("w1")).rejects.toMatchObject({
      message: "delete failed",
    });
  });
});
