import { Alert } from "react-native";

import { signInWithEmail, signUpWithEmail } from "@/api/endpoints/auth";
import { secureStoreUtilsMock } from "@/tests/mocks/secureStore";
import {
  queueFromMaybeSingle,
  supabaseMock,
} from "@/tests/mocks/supabase";

describe("api/endpoints/auth", () => {
  it("returns null and alerts on login error", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid credentials" },
    });

    const result = await signInWithEmail("x@test.com", "wrong");

    expect(result).toBeNull();
    expect(alertSpy).toHaveBeenCalled();
  });

  it("stores membership space id on successful login", async () => {
    const data = { user: { id: "user-1" } };
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data,
      error: null,
    });
    queueFromMaybeSingle("space_members", "select", {
      data: { space_id: "space-1" },
      error: null,
    });

    const result = await signInWithEmail("x@test.com", "good");

    expect(result).toEqual(data);
    expect(secureStoreUtilsMock.setSpaceId).toHaveBeenCalledWith("space-1");
    expect(secureStoreUtilsMock.deleteSpaceId).not.toHaveBeenCalled();
  });

  it("clears stored space id when member has no space", async () => {
    const data = { user: { id: "user-1" } };
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data,
      error: null,
    });
    queueFromMaybeSingle("space_members", "select", {
      data: { space_id: null },
      error: null,
    });

    await signInWithEmail("x@test.com", "good");

    expect(secureStoreUtilsMock.deleteSpaceId).toHaveBeenCalled();
    expect(secureStoreUtilsMock.setSpaceId).not.toHaveBeenCalled();
  });

  it("returns null on signup error", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { message: "signup failed" },
    });

    const result = await signUpWithEmail(
      "Name",
      "2000-01-01",
      "x@test.com",
      "pass",
    );

    expect(result).toBeNull();
    expect(alertSpy).toHaveBeenCalled();
  });

  it("returns null when signup session cannot be validated", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "user-1" },
        session: {
          access_token: "a",
          refresh_token: "r",
        },
      },
      error: null,
    });
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const result = await signUpWithEmail(
      "Name",
      "2000-01-01",
      "x@test.com",
      "pass",
    );

    expect(result).toBeNull();
    expect(alertSpy).toHaveBeenCalled();
  });

  it("returns signup data on success", async () => {
    const signUpData = {
      user: { id: "user-1" },
      session: { access_token: "a", refresh_token: "r" },
    };

    supabaseMock.auth.signUp.mockResolvedValueOnce({
      data: signUpData,
      error: null,
    });
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    const result = await signUpWithEmail(
      "Name",
      "2000-01-01",
      "x@test.com",
      "pass",
    );

    expect(result).toEqual(signUpData);
    expect(supabaseMock.auth.setSession).toHaveBeenCalled();
  });
});
