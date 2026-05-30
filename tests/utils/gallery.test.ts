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

  it("pickMultipleImages returns undefined when picker is canceled", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    await expect(pickMultipleImages()).resolves.toBeUndefined();
  });

  it("convertDate formats input date", () => {
    expect(convertDate("2026-03-06")).toBe("6 March 2026");
  });

  it("downloadAndSaveImage alerts when permission denied", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
      canAskAgain: true,
    });

    const savedCount = await downloadAndSaveImage(
      "i1",
      "https://example.com/a.jpg",
    );

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(false, [
      "photo",
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Permission Required",
      expect.stringContaining("Please allow full access"),
      undefined,
    );
    expect(savedCount).toBe(0);
  });

  it("downloadAndSaveImage alerts with settings hint when denied and cannot ask again", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
      canAskAgain: false,
    });

    const savedCount = await downloadAndSaveImage(
      "i1",
      "https://example.com/a.jpg",
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      "Permission Required",
      expect.stringContaining("Please enable it in your device settings."),
      [{ text: "OK" }],
    );
    expect(savedCount).toBe(0);
  });

  it("downloadAndSaveImage creates a missing album with the downloaded file", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValueOnce(null);

    const savedCount = await downloadAndSaveImage(
      "i1",
      "https://example.com/a.jpg",
    );

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(false, [
      "photo",
    ]);
    expect(MediaLibrary.createAlbumAsync).toHaveBeenCalledWith(
      "BubuDudu",
      undefined,
      false,
      "/tmp/downloaded.jpg",
    );
    expect(MediaLibrary.createAssetAsync).not.toHaveBeenCalled();
    expect(MediaLibrary.addAssetsToAlbumAsync).not.toHaveBeenCalled();
    expect(savedCount).toBe(1);
  });

  it("downloadAndSaveImage creates the asset directly in an existing album", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValueOnce({
      id: "album-1",
    });

    const savedCount = await downloadAndSaveImage(
      "i1",
      "https://example.com/a.jpg",
    );

    expect(MediaLibrary.createAssetAsync).toHaveBeenCalledWith(
      "/tmp/downloaded.jpg",
      { id: "album-1" },
    );
    expect(MediaLibrary.createAlbumAsync).not.toHaveBeenCalled();
    expect(MediaLibrary.addAssetsToAlbumAsync).not.toHaveBeenCalled();
    expect(savedCount).toBe(1);
  });

  it("multipleDownloadAndSaveImage alerts when permission denied", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
      canAskAgain: true,
    });

    const savedCount = await multipleDownloadAndSaveImage([] as any);

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(false, [
      "photo",
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Permission Required",
      expect.stringContaining("Please allow full access"),
      undefined,
    );
    expect(savedCount).toBe(0);
  });

  it("multipleDownloadAndSaveImage skips rows without url_orig", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.createAssetAsync as jest.Mock).mockClear();
    (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValue({
      id: "album-1",
    });

    const savedCount = await multipleDownloadAndSaveImage([
      { id: "1", url_orig: "https://x/a.jpg" },
      { id: "2", url_orig: undefined },
      { id: "3", url_orig: "https://x/b.jpg" },
    ] as any);

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(false, [
      "photo",
    ]);
    expect(MediaLibrary.createAssetAsync).toHaveBeenCalledTimes(2);
    expect(MediaLibrary.createAssetAsync).toHaveBeenCalledWith(
      "/tmp/downloaded.jpg",
      { id: "album-1" },
    );
    expect(MediaLibrary.addAssetsToAlbumAsync).not.toHaveBeenCalled();
    expect(savedCount).toBe(2);
  });

  it("multipleDownloadAndSaveImage alerts when download throws", async () => {
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
      canAskAgain: true,
    });
    (MediaLibrary.createAssetAsync as jest.Mock).mockRejectedValueOnce(
      new Error("download failed"),
    );

    const savedCount = await multipleDownloadAndSaveImage([
      { id: "1", url_orig: "https://x/a.jpg" },
    ] as any);

    expect(Alert.alert).toHaveBeenCalledWith("Error downloading images");
    expect(savedCount).toBe(0);
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
