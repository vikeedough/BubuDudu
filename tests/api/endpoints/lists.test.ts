import { addNewList, deleteList, fetchLists, updateList } from "@/api/endpoints/lists";
import { queueFrom } from "@/tests/mocks/supabase";

describe("api/endpoints/lists", () => {
  it("fetchLists returns rows on success", async () => {
    const rows = [{ id: "l1", type: "Todo", content: "Milk" }];
    queueFrom("lists", "select", { data: rows, error: null });

    const result = await fetchLists();

    expect(result).toEqual(rows);
  });

  it("fetchLists returns [] on error", async () => {
    queueFrom("lists", "select", {
      data: null,
      error: { message: "fetch fail" },
    });

    const result = await fetchLists();

    expect(result).toEqual([]);
  });

  it("addNewList returns true on success", async () => {
    queueFrom("lists", "insert", { data: null, error: null });

    await expect(addNewList("Todo", "Milk")).resolves.toBe(true);
  });

  it("addNewList returns false on error", async () => {
    queueFrom("lists", "insert", {
      data: null,
      error: { message: "insert fail" },
    });

    await expect(addNewList("Todo", "Milk")).resolves.toBe(false);
  });

  it("updateList returns true on success", async () => {
    queueFrom("lists", "update", { data: null, error: null });

    await expect(updateList("l1", "Todo", "Updated")).resolves.toBe(true);
  });

  it("updateList returns false on error", async () => {
    queueFrom("lists", "update", {
      data: null,
      error: { message: "update fail" },
    });

    await expect(updateList("l1", "Todo", "Updated")).resolves.toBe(false);
  });

  it("deleteList returns true on success", async () => {
    queueFrom("lists", "delete", { data: null, error: null });

    await expect(deleteList("l1")).resolves.toBe(true);
  });

  it("deleteList returns false on error", async () => {
    queueFrom("lists", "delete", {
      data: null,
      error: { message: "delete fail" },
    });

    await expect(deleteList("l1")).resolves.toBe(false);
  });
});
