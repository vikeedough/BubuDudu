export type SingaporePublicHoliday = Readonly<{
    date: string;
    name: string;
    observedFor?: string;
    source: "MOM";
}>;

export const singaporeHolidaySource = {
    authority: "Singapore Ministry of Manpower",
    url: "https://www.mom.gov.sg/employment-practices/public-holidays",
    verifiedOn: "2026-10-05",
    years: [2026, 2027],
    note: "Only MOM-listed replacement days are included; Sunday-rest-day replacements are labelled Observed.",
} as const;

// Annual, checked-in data. Never fetched at app startup or sent to Supabase.
export const singaporePublicHolidays: readonly SingaporePublicHoliday[] = [
    { date: "2026-01-01", name: "New Year's Day", source: "MOM" },
    { date: "2026-02-17", name: "Chinese New Year", source: "MOM" },
    { date: "2026-02-18", name: "Chinese New Year", source: "MOM" },
    { date: "2026-03-21", name: "Hari Raya Puasa", source: "MOM" },
    { date: "2026-04-03", name: "Good Friday", source: "MOM" },
    { date: "2026-05-01", name: "Labour Day", source: "MOM" },
    { date: "2026-05-27", name: "Hari Raya Haji", source: "MOM" },
    { date: "2026-05-31", name: "Vesak Day", source: "MOM" },
    { date: "2026-06-01", name: "Vesak Day (Observed)", observedFor: "2026-05-31", source: "MOM" },
    { date: "2026-08-09", name: "National Day", source: "MOM" },
    { date: "2026-08-10", name: "National Day (Observed)", observedFor: "2026-08-09", source: "MOM" },
    { date: "2026-11-08", name: "Deepavali", source: "MOM" },
    { date: "2026-11-09", name: "Deepavali (Observed)", observedFor: "2026-11-08", source: "MOM" },
    { date: "2026-12-25", name: "Christmas Day", source: "MOM" },
    { date: "2027-01-01", name: "New Year's Day", source: "MOM" },
    { date: "2027-02-06", name: "Chinese New Year", source: "MOM" },
    { date: "2027-02-07", name: "Chinese New Year", source: "MOM" },
    { date: "2027-02-08", name: "Chinese New Year (Observed)", observedFor: "2027-02-07", source: "MOM" },
    { date: "2027-03-10", name: "Hari Raya Puasa", source: "MOM" },
    { date: "2027-03-26", name: "Good Friday", source: "MOM" },
    { date: "2027-05-01", name: "Labour Day", source: "MOM" },
    { date: "2027-05-17", name: "Hari Raya Haji", source: "MOM" },
    { date: "2027-05-20", name: "Vesak Day", source: "MOM" },
    { date: "2027-08-09", name: "National Day", source: "MOM" },
    { date: "2027-10-28", name: "Deepavali", source: "MOM" },
    { date: "2027-12-25", name: "Christmas Day", source: "MOM" },
];

export function isCalendarDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function getSingaporePublicHolidays(startDate: string, endDate: string): SingaporePublicHoliday[] {
    if (!isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate) throw new Error("Invalid holiday date range.");
    return singaporePublicHolidays.filter(({ date }) => date >= startDate && date <= endDate);
}
