import {
  fetchMilestones,
  insertOrUpdateMilestone,
} from "@/api/endpoints/milestones";
import { queueFrom, queueFromSingle } from "@/tests/mocks/supabase";

describe("api/endpoints/milestones", () => {
  it("fetchMilestones returns rows on success", async () => {
    const rows = [{ id: 1, title: "Anniversary", date: "2026-06-01" }];
    queueFrom("milestones", "select", { data: rows, error: null });

    const result = await fetchMilestones("space-1");

    expect(result).toEqual(rows);
  });

  it("fetchMilestones returns [] on error", async () => {
    queueFrom("milestones", "select", {
      data: null,
      error: { message: "fetch fail" },
    });

    const result = await fetchMilestones("space-1");

    expect(result).toEqual([]);
  });

  it("insertOrUpdateMilestone returns row on success", async () => {
    const row = { id: 1, title: "Anniversary", date: "2026-06-01" };
    queueFromSingle("milestones", "upsert", { data: row, error: null });

    const result = await insertOrUpdateMilestone(
      "space-1",
      "Anniversary",
      "2026-06-01",
    );

    expect(result).toEqual(row);
  });

  it("insertOrUpdateMilestone returns null on error", async () => {
    queueFromSingle("milestones", "upsert", {
      data: null,
      error: { message: "upsert fail" },
    });

    const result = await insertOrUpdateMilestone(
      "space-1",
      "Anniversary",
      "2026-06-01",
    );

    expect(result).toBeNull();
  });
});
