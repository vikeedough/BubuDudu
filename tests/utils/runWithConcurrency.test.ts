import { runWithConcurrency } from "@/utils/runWithConcurrency";

describe("utils/runWithConcurrency", () => {
  it("processes every item exactly once", async () => {
    const items = [1, 2, 3, 4, 5];
    const seen: number[] = [];

    await runWithConcurrency(items, 2, async (item) => {
      seen.push(item);
    });

    expect(seen.sort((a, b) => a - b)).toEqual(items);
  });

  it("respects the concurrency limit", async () => {
    const items = [1, 2, 3, 4, 5, 6];
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency(items, 2, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("propagates worker errors", async () => {
    await expect(
      runWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) {
          throw new Error("boom");
        }
      }),
    ).rejects.toThrow("boom");
  });

  it("handles empty input", async () => {
    const worker = jest.fn();

    await runWithConcurrency([], 3, worker);

    expect(worker).not.toHaveBeenCalled();
  });
});
