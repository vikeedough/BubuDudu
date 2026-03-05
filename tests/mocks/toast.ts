export const toastMock = {
  show: jest.fn<string, [any?, any?]>(),
  update: jest.fn<void, [string, any]>(),
  dismiss: jest.fn<void, [string]>(),
  dismissAll: jest.fn<void, []>(),
};

export function resetToastMock() {
  toastMock.show.mockReset();
  toastMock.update.mockReset();
  toastMock.dismiss.mockReset();
  toastMock.dismissAll.mockReset();

  toastMock.show.mockReturnValue("toast-id");
}
