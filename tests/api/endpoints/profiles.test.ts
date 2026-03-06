import { Alert } from "react-native";

import {
  fetchProfiles,
  updateProfileName,
  updateProfileNote,
  uploadAvatarAndUpdateUser,
} from "@/api/endpoints/profiles";
import {
  queueFrom,
  queueStorage,
  supabaseMock,
} from "@/tests/mocks/supabase";

const PROFILE = {
  id: "user-1",
  name: "Alex",
  avatar_url: null,
  created_at: "2026-03-06T00:00:00.000Z",
  note: null,
  note_updated_at: null,
  date_of_birth: "2000-01-01",
};

describe("api/endpoints/profiles", () => {
  it("maps joined profile rows", async () => {
    queueFrom("space_members", "select", {
      data: [
        { user_id: "user-1", profiles: PROFILE },
        { user_id: "user-2", profiles: null },
      ],
      error: null,
    });

    const result = await fetchProfiles("space-1");

    expect(result).toEqual([PROFILE]);
  });

  it("returns [] and alerts on fetch error", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    queueFrom("space_members", "select", {
      data: null,
      error: { message: "failed" },
    });

    const result = await fetchProfiles("space-1");

    expect(result).toEqual([]);
    expect(alertSpy).toHaveBeenCalled();
  });

  it("updates profile name", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFrom("profiles", "update", { data: null, error: null });

    const result = await updateProfileName("New Name");

    expect(result).toBe(true);
  });

  it("returns null when update profile name cannot resolve user", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "auth failed" },
    });

    const result = await updateProfileName("New Name");

    expect(result).toBeNull();
  });

  it("returns null when update profile name fails on update", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFrom("profiles", "update", {
      data: null,
      error: { message: "update failed" },
    });

    const result = await updateProfileName("New Name");

    expect(result).toBeNull();
  });

  it("returns false when update note cannot resolve user", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "auth" },
    });

    const result = await updateProfileNote("hello");

    expect(result).toBe(false);
  });

  it("updates profile note and timestamp", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFrom("profiles", "update", { data: null, error: null });

    const result = await updateProfileNote("updated note");

    expect(result).toBe(true);
    const profilesBuilder = (supabaseMock.from as jest.Mock).mock.results[0]
      .value;

    expect(profilesBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        note: "updated note",
        note_updated_at: expect.any(String),
      }),
    );
  });

  it("returns false when update profile note fails on update", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    queueFrom("profiles", "update", {
      data: null,
      error: { message: "update note failed" },
    });

    const result = await updateProfileNote("updated note");

    expect(result).toBe(false);
  });

  it("uploads avatar and updates profile", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    queueStorage("avatars", "upload", {
      data: { path: "avatars/user-1.jpg" },
      error: null,
    });
    queueStorage("avatars", "getPublicUrl", {
      data: { publicUrl: "https://public/avatar.jpg" },
      error: null,
    });
    queueFrom("profiles", "update", { data: null, error: null });

    const result = await uploadAvatarAndUpdateUser("file://avatar.jpg");

    expect(result).toBe("https://public/avatar.jpg");
  });

  it("returns null when avatar upload cannot resolve user", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "auth failed" },
    });

    const result = await uploadAvatarAndUpdateUser("file://avatar.jpg");

    expect(result).toBeNull();
  });

  it("returns null when upload fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    queueStorage("avatars", "upload", {
      data: null,
      error: { message: "upload fail" },
    });

    const result = await uploadAvatarAndUpdateUser("file://avatar.jpg");

    expect(result).toBeNull();
  });

  it("returns null when avatar upload succeeds but profile update fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    queueStorage("avatars", "upload", {
      data: { path: "avatars/user-1.jpg" },
      error: null,
    });
    queueStorage("avatars", "getPublicUrl", {
      data: { publicUrl: "https://public/avatar.jpg" },
      error: null,
    });
    queueFrom("profiles", "update", {
      data: null,
      error: { message: "profile update failed" },
    });

    const result = await uploadAvatarAndUpdateUser("file://avatar.jpg");

    expect(result).toBeNull();
  });
});
