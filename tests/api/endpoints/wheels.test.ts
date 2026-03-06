import {
  addNewWheel,
  deleteWheel,
  fetchWheels,
  updateWheel,
  updateWheelChoices,
  updateWheelTitle,
} from "@/api/endpoints/wheels";
import { queueFrom } from "@/tests/mocks/supabase";

describe("api/endpoints/wheels", () => {
  it("fetchWheels returns rows on success", async () => {
    const rows = [{ id: "w1", title: "Dinner", choices: ["A"] }];
    queueFrom("wheel", "select", { data: rows, error: null });

    const result = await fetchWheels();

    expect(result).toEqual(rows);
  });

  it("fetchWheels returns [] on error", async () => {
    queueFrom("wheel", "select", {
      data: null,
      error: { message: "fetch fail" },
    });

    const result = await fetchWheels();

    expect(result).toEqual([]);
  });

  it("updateWheel returns true on success", async () => {
    queueFrom("wheel", "update", { data: null, error: null });

    await expect(updateWheel("w1", ["A", "B"])).resolves.toBe(true);
  });

  it("updateWheel returns false on error", async () => {
    queueFrom("wheel", "update", {
      data: null,
      error: { message: "update fail" },
    });

    await expect(updateWheel("w1", ["A", "B"])).resolves.toBe(false);
  });

  it("updateWheelTitle returns false on error", async () => {
    queueFrom("wheel", "update", {
      data: null,
      error: { message: "title fail" },
    });

    await expect(updateWheelTitle("w1", "New")).resolves.toBe(false);
  });

  it("updateWheelTitle returns true on success", async () => {
    queueFrom("wheel", "update", { data: null, error: null });

    await expect(updateWheelTitle("w1", "New")).resolves.toBe(true);
  });

  it("updateWheelChoices returns true on success", async () => {
    queueFrom("wheel", "update", { data: null, error: null });

    await expect(updateWheelChoices("w1", ["X"])).resolves.toBe(true);
  });

  it("updateWheelChoices returns false on error", async () => {
    queueFrom("wheel", "update", {
      data: null,
      error: { message: "choices fail" },
    });

    await expect(updateWheelChoices("w1", ["X"])).resolves.toBe(false);
  });

  it("addNewWheel returns true on success", async () => {
    queueFrom("wheel", "insert", { data: null, error: null });

    await expect(addNewWheel("Dinner", ["A"])).resolves.toBe(true);
  });

  it("addNewWheel returns false on error", async () => {
    queueFrom("wheel", "insert", {
      data: null,
      error: { message: "insert fail" },
    });

    await expect(addNewWheel("Dinner", ["A"])).resolves.toBe(false);
  });

  it("deleteWheel returns false on error", async () => {
    queueFrom("wheel", "delete", {
      data: null,
      error: { message: "delete fail" },
    });

    await expect(deleteWheel("w1")).resolves.toBe(false);
  });

  it("deleteWheel returns true on success", async () => {
    queueFrom("wheel", "delete", { data: null, error: null });

    await expect(deleteWheel("w1")).resolves.toBe(true);
  });
});
