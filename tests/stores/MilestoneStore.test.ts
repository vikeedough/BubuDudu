import { useMilestoneStore } from "@/stores/MilestoneStore";
import { resetAllStores } from "@/tests/helpers/resetStores";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import {
  queueFromMaybeSingle,
  queueFromSingle,
} from "@/tests/mocks/supabase";

const MILESTONE = {
  id: 1,
  title: "Anniversary",
  date: "2026-06-01",
};

describe("stores/MilestoneStore", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("returns null when there is no active space", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    const result = await useMilestoneStore.getState().fetchMilestone();

    expect(result).toBeNull();
    expect(useMilestoneStore.getState().milestone).toBeNull();
    expect(useMilestoneStore.getState().isLoading).toBe(false);
  });

  it("sets error on fetch failure", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromMaybeSingle("milestones", "select", {
      data: null,
      error: { message: "fetch failed" },
    });

    const result = await useMilestoneStore.getState().fetchMilestone();

    expect(result).toBeNull();
    expect(useMilestoneStore.getState().error).toBe("fetch failed");
  });

  it("returns null when milestone row is missing", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromMaybeSingle("milestones", "select", {
      data: null,
      error: null,
    });

    const result = await useMilestoneStore.getState().fetchMilestone();

    expect(result).toBeNull();
    expect(useMilestoneStore.getState().milestone).toBeNull();
    expect(useMilestoneStore.getState().isLoading).toBe(false);
  });

  it("upserts milestone and updates store", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("milestones", "upsert", {
      data: MILESTONE,
      error: null,
    });

    const result = await useMilestoneStore
      .getState()
      .upsertMilestone("Anniversary", "2026-06-01");

    expect(result).toEqual(MILESTONE);
    expect(useMilestoneStore.getState().milestone).toEqual(MILESTONE);
    expect(useMilestoneStore.getState().isLoading).toBe(false);
  });

  it("throws when no space id during upsert", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce(null);

    await expect(
      useMilestoneStore
        .getState()
        .upsertMilestone("Anniversary", "2026-06-01"),
    ).rejects.toThrow("No spaceId found");

    expect(useMilestoneStore.getState().error).toBe("No spaceId found");
  });

  it("throws and stores error when upsert query fails", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("milestones", "upsert", {
      data: null,
      error: { message: "upsert failed" },
    });

    await expect(
      useMilestoneStore
        .getState()
        .upsertMilestone("Anniversary", "2026-06-01"),
    ).rejects.toMatchObject({
      message: "upsert failed",
    });

    expect(useMilestoneStore.getState().error).toBe("upsert failed");
    expect(useMilestoneStore.getState().isLoading).toBe(false);
  });

  it("clears milestone state", () => {
    useMilestoneStore.setState({
      milestone: MILESTONE,
      error: "oops",
      isLoading: true,
    });

    useMilestoneStore.getState().clearMilestone();

    expect(useMilestoneStore.getState()).toMatchObject({
      milestone: null,
      error: null,
      isLoading: false,
    });
  });
});
