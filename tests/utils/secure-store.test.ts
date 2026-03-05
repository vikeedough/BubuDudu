jest.unmock("@/utils/secure-store");

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from "expo-secure-store";

import { deleteSpaceId, getSpaceId, setSpaceId } from "@/utils/secure-store";

describe("utils/secure-store", () => {
  it("getSpaceId reads active_space_id", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("space-1");

    const value = await getSpaceId();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("active_space_id");
    expect(value).toBe("space-1");
  });

  it("setSpaceId writes active_space_id", async () => {
    await setSpaceId("space-2");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "active_space_id",
      "space-2",
    );
  });

  it("deleteSpaceId removes active_space_id", async () => {
    await deleteSpaceId();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("active_space_id");
  });
});
