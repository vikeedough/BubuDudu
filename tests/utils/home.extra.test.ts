jest.mock("@/api/endpoints", () => ({
  uploadAvatarAndUpdateUser: jest.fn(),
}));

import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import { uploadAvatarAndUpdateUser } from "@/api/endpoints";
import {
  getDate,
  getDay,
  getToday,
  pickAndUploadAvatar,
} from "@/utils/home";

jest.mock("@/utils/shrinkImage", () => ({
  shrinkImage: jest.fn(async () => ({
    uri: "file://processed.jpg",
    width: 100,
    height: 100,
  })),
}));

describe("utils/home (extra)", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("formats today/day/date", () => {
    expect(getToday()).toMatch(/\d{4}/);
    expect(getDay().length).toBeGreaterThan(0);
    expect(getDate().length).toBeGreaterThan(0);
  });

  it("pickAndUploadAvatar returns early when permission denied", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    await expect(pickAndUploadAvatar()).resolves.toBeUndefined();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("pickAndUploadAvatar returns undefined when picker canceled", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    await expect(pickAndUploadAvatar()).resolves.toBeUndefined();
  });

  it("pickAndUploadAvatar uploads processed avatar url", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://original.jpg" }],
    });
    (uploadAvatarAndUpdateUser as jest.Mock).mockResolvedValueOnce("https://public/avatar.jpg");

    const result = await pickAndUploadAvatar();

    expect(uploadAvatarAndUpdateUser).toHaveBeenCalledWith("file://processed.jpg");
    expect(result).toBe("https://public/avatar.jpg");
  });

  it("pickAndUploadAvatar alerts when upload fails", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://original.jpg" }],
    });
    (uploadAvatarAndUpdateUser as jest.Mock).mockResolvedValueOnce(null);

    await expect(pickAndUploadAvatar()).resolves.toBeUndefined();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
