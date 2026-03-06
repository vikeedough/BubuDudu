import "@testing-library/jest-native/extend-expect";

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock("@/api/clients/supabaseClient", () => {
  const { supabaseMock } = require("./tests/mocks/supabase");
  return { supabase: supabaseMock };
});

jest.mock("@/utils/secure-store", () => {
  const { secureStoreUtilsMock } = require("./tests/mocks/secureStore");
  return secureStoreUtilsMock;
});

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: true,
    assets: [],
  }),
  UIImagePickerPreferredAssetRepresentationMode: {
    Automatic: "automatic",
  },
}));

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted", canAskAgain: true }),
  createAssetAsync: jest.fn().mockResolvedValue({ id: "asset-1" }),
  getAlbumAsync: jest.fn().mockResolvedValue(null),
  createAlbumAsync: jest.fn().mockResolvedValue({ id: "album-1" }),
  addAssetsToAlbumAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-file-system", () => {
  class File {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    static async downloadFileAsync() {
      return { uri: "/tmp/downloaded.jpg" };
    }

    async base64() {
      return "ZmFrZQ==";
    }
  }

  class Directory {
    uri: string;
    exists: boolean;

    constructor(...parts: string[]) {
      this.uri = parts.join("/");
      this.exists = false;
    }

    create() {
      this.exists = true;
    }
  }

  const Paths = { cache: "/tmp" };

  return {
    File,
    Directory,
    Paths,
  };
});

jest.mock("expo-image-manipulator", () => {
  const createImageRef = (width = 100, height = 100) => ({
    width,
    height,
    saveAsync: jest.fn().mockResolvedValue({ uri: "file://image.jpg" }),
    release: jest.fn(),
  });

  return {
    SaveFormat: {
      JPEG: "jpeg",
      PNG: "png",
    },
    ImageManipulator: {
      manipulate: jest.fn(() => ({
        resize: jest.fn(),
        reset: jest.fn(),
        renderAsync: jest.fn().mockResolvedValue(createImageRef()),
        release: jest.fn(),
      })),
    },
  };
});

beforeEach(() => {
  const { resetSupabaseMock } = require("./tests/mocks/supabase");
  const { resetSecureStoreUtilsMock } = require("./tests/mocks/secureStore");

  resetSupabaseMock();
  resetSecureStoreUtilsMock();

  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
