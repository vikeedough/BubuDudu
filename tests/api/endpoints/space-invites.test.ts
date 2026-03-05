import { fetchSpaceInvite } from "@/api/endpoints/space-invites";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import { queueFromSingle } from "@/tests/mocks/supabase";

describe("api/endpoints/space-invites", () => {
  it("returns invite on success", async () => {
    const invite = {
      space_id: "space-1",
      code: "ABC123",
      created_by: "user-1",
      created_at: "2026-03-06T00:00:00.000Z",
    };

    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("space_invites", "select", {
      data: invite,
      error: null,
    });

    const result = await fetchSpaceInvite();

    expect(result).toEqual(invite);
  });

  it("returns null on fetch error", async () => {
    secureStoreUtilsMock.getSpaceId.mockResolvedValueOnce("space-1");
    queueFromSingle("space_invites", "select", {
      data: null,
      error: { message: "not found" },
    });

    const result = await fetchSpaceInvite();

    expect(result).toBeNull();
  });
});
