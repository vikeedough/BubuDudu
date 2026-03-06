import { useToastStore } from "@/stores/ToastStore";
import { resetAllStores } from "@/tests/helpers/resetStores";

describe("stores/ToastStore", () => {
  beforeEach(() => {
    resetAllStores();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  it("creates a new toast when showing without explicit id", () => {
    const id = useToastStore.getState().show({ title: "Hello" });
    const state = useToastStore.getState();

    expect(id).toBeTruthy();
    expect(state.order).toEqual([id]);
    expect(state.byId[id].payload).toEqual({ title: "Hello" });
    expect(state.byId[id].createdAt).toBe(1_700_000_000_000);
  });

  it("merges payload when showing with existing id", () => {
    const state = useToastStore.getState();

    const id = state.show("upload", { title: "Uploading" });
    state.show("upload", { progress: 0.5 });

    const next = useToastStore.getState();

    expect(id).toBe("upload");
    expect(next.order).toEqual(["upload"]);
    expect(next.byId.upload.payload).toEqual({
      title: "Uploading",
      progress: 0.5,
    });
  });

  it("updates an existing toast payload", () => {
    const state = useToastStore.getState();
    state.show("fixed", { title: "Title" });

    state.update("fixed", { message: "Updated" });

    expect(useToastStore.getState().byId.fixed.payload).toEqual({
      title: "Title",
      message: "Updated",
    });
  });

  it("update is a no-op for unknown toast id", () => {
    const before = useToastStore.getState();

    before.update("missing", { title: "X" });

    const after = useToastStore.getState();
    expect(after.order).toEqual([]);
    expect(after.byId).toEqual({});
  });

  it("dismiss removes toast from both maps", () => {
    const state = useToastStore.getState();
    state.show("one", { title: "One" });
    state.show("two", { title: "Two" });

    state.dismiss("one");

    const next = useToastStore.getState();
    expect(next.order).toEqual(["two"]);
    expect(next.byId.one).toBeUndefined();
    expect(next.byId.two).toBeDefined();
  });

  it("dismiss is a no-op for unknown toast id", () => {
    const state = useToastStore.getState();
    state.show("one", { title: "One" });

    state.dismiss("missing");

    expect(useToastStore.getState().order).toEqual(["one"]);
    expect(useToastStore.getState().byId.one).toBeDefined();
  });

  it("dismissAll clears all toasts", () => {
    const state = useToastStore.getState();
    state.show("one", { title: "One" });
    state.show("two", { title: "Two" });

    state.dismissAll();

    expect(useToastStore.getState()).toMatchObject({
      order: [],
      byId: {},
    });
  });
});
