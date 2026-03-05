export const secureStoreUtilsMock = {
  getSpaceId: jest.fn<Promise<string | null>, []>(),
  setSpaceId: jest.fn<Promise<void>, [string]>(),
  deleteSpaceId: jest.fn<Promise<void>, []>(),
};

export function resetSecureStoreUtilsMock() {
  secureStoreUtilsMock.getSpaceId.mockReset();
  secureStoreUtilsMock.setSpaceId.mockReset();
  secureStoreUtilsMock.deleteSpaceId.mockReset();

  secureStoreUtilsMock.getSpaceId.mockResolvedValue(null);
  secureStoreUtilsMock.setSpaceId.mockResolvedValue();
  secureStoreUtilsMock.deleteSpaceId.mockResolvedValue();
}
