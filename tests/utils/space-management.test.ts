import { Alert } from "react-native";

import { joinSpace, createSpace } from "@/utils/space-management";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import {
  queueFrom,
  queueFromSingle,
  supabaseMock,
} from "@/tests/mocks/supabase";

describe("utils/space-management", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("createSpace returns early when no authenticated user", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await createSpace("BubuDudu");

    expect(result).toBeUndefined();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("createSpace creates space, membership, invite and stores space id", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    queueFromSingle("spaces", "insert", {
      data: { id: "space-1" },
      error: null,
    });
    queueFrom("space_members", "insert", { data: null, error: null });
    queueFrom("space_invites", "insert", { data: null, error: null });

    const result = await createSpace("BubuDudu");

    expect(result?.spaceId).toBe("space-1");
    expect(result?.inviteCode).toHaveLength(8);
    expect(secureStoreUtilsMock.setSpaceId).toHaveBeenCalledWith("space-1");
  });

  it("createSpace retries on duplicate invite code error", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    queueFromSingle("spaces", "insert", {
      data: { id: "space-1" },
      error: null,
    });
    queueFrom("space_members", "insert", { data: null, error: null });
    queueFrom(
      "space_invites",
      "insert",
      { data: null, error: { message: "duplicate key value" } },
      { data: null, error: null },
    );

    const result = await createSpace("BubuDudu");

    expect(result?.spaceId).toBe("space-1");
    expect(supabaseMock.from).toHaveBeenCalledWith("space_invites");
  });

  it("createSpace throws for non-duplicate invite errors", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    queueFromSingle("spaces", "insert", {
      data: { id: "space-1" },
      error: null,
    });
    queueFrom("space_members", "insert", { data: null, error: null });
    queueFrom("space_invites", "insert", {
      data: null,
      error: { message: "forbidden" },
    });

    await expect(createSpace("BubuDudu")).rejects.toThrow(
      "Invite Code Creation Error: forbidden",
    );
  });

  it("joinSpace returns early for invalid invite code", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFromSingle("space_invites", "select", {
      data: null,
      error: { message: "not found" },
    });

    const result = await joinSpace("BADCODE");

    expect(result).toBeUndefined();
    expect(Alert.alert).toHaveBeenCalledWith("Invite Error", "Invalid invite code.");
  });

  it("joinSpace returns early when member insert fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFromSingle("space_invites", "select", {
      data: { space_id: "space-1" },
      error: null,
    });
    queueFrom("space_members", "insert", {
      data: null,
      error: { message: "already member" },
    });

    const result = await joinSpace("CODE");

    expect(result).toBeUndefined();
    expect(secureStoreUtilsMock.setSpaceId).not.toHaveBeenCalled();
  });

  it("joinSpace stores space id and returns it on success", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFromSingle("space_invites", "select", {
      data: { space_id: "space-1" },
      error: null,
    });
    queueFrom("space_members", "insert", { data: null, error: null });

    const result = await joinSpace(" CODE ");

    expect(result).toBe("space-1");
    expect(secureStoreUtilsMock.setSpaceId).toHaveBeenCalledWith("space-1");
  });
});
