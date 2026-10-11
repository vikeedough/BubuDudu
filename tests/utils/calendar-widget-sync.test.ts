import AsyncStorage from "@react-native-async-storage/async-storage";

import WidgetNative from "@/modules/calendar-widget";
import { expandOccurrences } from "@/utils/calendar";
import { clearWidgetPrivateData, publishCalendarWidget, setWidgetOwner } from "@/widgets/calendar/sync";

import { calendarTestEvent } from "../helpers/calendar";

jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: {
    getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(undefined), removeItem: jest.fn().mockResolvedValue(undefined),
} }));
jest.mock("expo-linking", () => ({ createURL: () => "bubududu://calendar-widget" }));
jest.mock("@/modules/calendar-widget", () => ({ __esModule: true, default: { setPayload: jest.fn(), getPayload: jest.fn(), scheduleMidnight: jest.fn() } }));
jest.mock("@/widgets/calendar/refresh", () => ({ refreshPlatformWidgets: jest.fn().mockResolvedValue(undefined) }));

beforeEach(async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await clearWidgetPrivateData();
    (WidgetNative!.setPayload as jest.Mock).mockClear();
    jest.useFakeTimers().setSystemTime(new Date("2026-08-09T00:00:00+08:00"));
});
afterEach(() => jest.useRealTimers());
const lastData = () => JSON.parse((WidgetNative!.setPayload as jest.Mock).mock.calls.at(-1)![0]);
const occurrences = () => expandOccurrences([calendarTestEvent()], [], "2026-08-01", "2026-08-31");

it("publishes minimal events, clears immediately at logout and rejects an older in-flight publication", async () => {
    const ticket = await setWidgetOwner("user:space");
    await publishCalendarWidget(occurrences(), ticket);
    expect(lastData().items[0].title).toBe("Together");
    const clearing = clearWidgetPrivateData();
    expect(lastData().signedIn).toBe(false);
    expect(lastData().items).toEqual([]);
    await publishCalendarWidget(occurrences(), ticket);
    await clearing;
    expect(lastData().signedIn).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("calendar-widget-owner-v1");
});
it("removes the earlier account before an account/space switch can publish", async () => {
    const ticket = await setWidgetOwner("first:space");
    await publishCalendarWidget(occurrences(), ticket);
    const change = setWidgetOwner("second:space");
    expect(lastData().items).toEqual([]);
    const nextTicket = await change;
    await publishCalendarWidget(occurrences(), ticket);
    expect(lastData().items).toEqual([]);
    await publishCalendarWidget(occurrences(), nextTicket);
    expect(lastData().items).toHaveLength(1);
});
it("does not allow delayed owner metadata reads to restore data after logout", async () => {
    let resolve!: (value: string | null) => void;
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const signingIn = setWidgetOwner("first:space");
    await Promise.resolve(); await Promise.resolve();
    const clearing = clearWidgetPrivateData();
    resolve(null);
    const ticket = await signingIn;
    await clearing;
    await publishCalendarWidget(occurrences(), ticket);
    expect(lastData().signedIn).toBe(false);
    expect(lastData().items).toEqual([]);
});
