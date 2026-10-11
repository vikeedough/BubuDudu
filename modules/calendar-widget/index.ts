import { requireOptionalNativeModule } from "expo-modules-core";

export interface CalendarWidgetNativeModule {
    getCalendarURL(): string | null;
    setPayload(payload: string): void;
    getPayload(): string | null;
    scheduleMidnight(): void;
}
export default requireOptionalNativeModule<CalendarWidgetNativeModule>("BubuDuduCalendarWidget");
