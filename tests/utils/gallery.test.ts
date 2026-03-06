import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Alert } from "react-native";

import {
  convertDate,
  downloadAndSaveImage,
  multipleDownloadAndSaveImage,
  normalizeGalleries,
  pickMultipleImages,
} from "@/utils/gallery";

describe("utils/gallery", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockClear();
    (MediaLibrary.createAssetAsync as jest.Mock).mockClear();
    (MediaLibrary.getAlbumAsync as jest.Mock).mockClear();
    (MediaLibrary.createAlbumAsync as jest.Mock).mockClear();
    (MediaLibrary.addAssetsToAlbumAsync as jest.Mock).mockClear();
  });

  it("pickMultipleImages returns undefined when permission denied", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    await expect(pickMultipleImages()).resolves.toBeUndefined();
  });

  it("pickMultipleImages returns selected uris", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://a.jpg" }, { uri: "file://b.jpg" }],
    });

    const result = await pickMultipleImages();

    expect(result).toEqual(["file://a.jpg", "file://b.jpg"]);
  });

  it("convertDate formats input date", () => {
    expect(convertDate("2026-03-06")).toBe("6 March 2026");
  });

  it("downloadAndSaveImage alerts when permission denied", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
      canAskAgain: true,
    });

    await downloadAndSaveImage("i1", "https://example.com/a.jpg");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Permission Required",
      expect.stringContaining("Please allow full access"),
      undefined,
    );
  });

  it("downloadAndSaveImage saves and creates album", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValueOnce(null);

    await downloadAndSaveImage("i1", "https://example.com/a.jpg");

    expect(MediaLibrary.createAssetAsync).toHaveBeenCalled();
    expect(MediaLibrary.createAlbumAsync).toHaveBeenCalled();
  });

  it("downloadAndSaveImage adds asset to existing album", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValueOnce({
      id: "album-1",
    });

    await downloadAndSaveImage("i1", "https://example.com/a.jpg");

    expect(MediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.createAlbumAsync).not.toHaveBeenCalled();
  });

  it("multipleDownloadAndSaveImage alerts when permission denied", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
    });

    await multipleDownloadAndSaveImage([] as any);

    expect(Alert.alert).toHaveBeenCalledWith("Permission to save images was denied");
  });

  it("multipleDownloadAndSaveImage skips rows without url_orig", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.createAssetAsync as jest.Mock).mockClear();

    await multipleDownloadAndSaveImage([
      { id: "1", url_orig: "https://x/a.jpg" },
      { id: "2", url_orig: undefined },
      { id: "3", url_orig: "https://x/b.jpg" },
    ] as any);

    expect(MediaLibrary.createAssetAsync).toHaveBeenCalledTimes(2);
  });

  it("multipleDownloadAndSaveImage alerts when download throws", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.createAssetAsync as jest.Mock).mockRejectedValueOnce(
      new Error("download failed"),
    );

    await multipleDownloadAndSaveImage([
      { id: "1", url_orig: "https://x/a.jpg" },
    ] as any);

    expect(Alert.alert).toHaveBeenCalledWith("Error downloading images");
  });

  it("normalizeGalleries converts string dates to Date", () => {
    const now = new Date("2026-03-06T00:00:00.000Z");
    const input = [
      { id: "g1", date: "2026-03-06" },
      { id: "g2", date: now },
    ] as any;

    const out = normalizeGalleries(input);

    expect(out[0].date instanceof Date).toBe(true);
    expect(out[1].date).toBe(now);
  });
});
