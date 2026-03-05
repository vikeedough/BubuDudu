import { toast } from "@/toast/api";
import { useToastStore } from "@/stores/ToastStore";
import { resetAllStores } from "@/tests/helpers/resetStores";

describe("toast/api", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("proxies show and returns id", () => {
    const id = toast.show({ title: "Proxy" });

    expect(id).toBeTruthy();
    expect(useToastStore.getState().byId[id].payload.title).toBe("Proxy");
  });

  it("proxies update", () => {
    const id = toast.show("fixed", { title: "Initial" });

    toast.update(id, { progress: 0.4 });

    expect(useToastStore.getState().byId[id].payload).toEqual({
      title: "Initial",
      progress: 0.4,
    });
  });

  it("proxies dismiss and dismissAll", () => {
    toast.show("one", { title: "One" });
    toast.show("two", { title: "Two" });

    toast.dismiss("one");
    expect(useToastStore.getState().order).toEqual(["two"]);

    toast.dismissAll();
    expect(useToastStore.getState().order).toEqual([]);
  });
});
