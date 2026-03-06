import { fetchQuotes } from "@/api/endpoints/quotes";
import { queueFrom } from "@/tests/mocks/supabase";

describe("api/endpoints/quotes", () => {
  it("returns quotes on success", async () => {
    const quotes = [{ id: "q1", quote: "Hello", created_at: "2026-01-01" }];
    queueFrom("quotes", "select", { data: quotes, error: null });

    const result = await fetchQuotes("space-1");

    expect(result).toEqual(quotes);
  });

  it("returns [] on error", async () => {
    queueFrom("quotes", "select", {
      data: null,
      error: { message: "broken" },
    });

    const result = await fetchQuotes("space-1");

    expect(result).toEqual([]);
  });
});
