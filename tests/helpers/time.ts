export function freezeTime(iso: string) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(iso));
}

export function restoreTime() {
  jest.useRealTimers();
}
