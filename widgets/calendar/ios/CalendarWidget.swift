import WidgetKit
import SwiftUI

struct WidgetItem: Codable, Identifiable {
  let id: String
  let kind: String
  let title: String
  let date: String
  let isAllDay: Bool
  let startTime: String?
  let endTime: String?
  let colorKey: String
  var timeLabel: String {
    kind == "holiday" ? "Public holiday · All day" : isAllDay ? "All day" : "\(startTime ?? "") – \(endTime ?? "")"
  }
}
struct WidgetDay: Codable, Identifiable {
  let date: String
  let day: Int
  let inMonth: Bool
  let isToday: Bool
  let colorKeys: [String]
  var id: String { date }
}
struct WidgetMonth: Codable {
  let year: Int
  let month: Int
  let label: String
  let days: [WidgetDay]
}
struct WidgetSnapshot: Codable {
  let generatedAt: String
  let singaporeDate: String
  let dateLabel: String
  let signedIn: Bool
  let month: WidgetMonth
  let today: [WidgetItem]
  let upcoming: [WidgetItem]
  let emptyText: String
}
struct SavedEntry: Codable { let date: String; let snapshot: WidgetSnapshot }
struct WidgetPayload: Codable {
  let schemaVersion: Int
  let signedIn: Bool
  let generatedAt: String
  let calendarUrl: String
  let items: [WidgetItem]
  let holidays: [WidgetItem]
  let timeline: [SavedEntry]
}
struct CalendarEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
  let calendarUrl: String
}

enum SingaporeClock {
  static var calendar: Calendar {
    var value = Calendar(identifier: .gregorian)
    value.timeZone = TimeZone(identifier: "Asia/Singapore")!
    value.locale = Locale(identifier: "en_GB")
    return value
  }
  static func format(_ date: Date, _ pattern: String) -> String {
    let formatter = DateFormatter()
    formatter.calendar = calendar
    formatter.timeZone = calendar.timeZone
    formatter.locale = Locale(identifier: "en_GB")
    formatter.dateFormat = pattern
    return formatter.string(from: date)
  }
  // Fallback after the saved JS timeline horizon: continue advancing dates,
  // grids, known event days and static holidays. No network or auth runtime.
  static func snapshot(_ date: Date, _ payload: WidgetPayload?) -> WidgetSnapshot {
    let cal = calendar
    let day = format(date, "yyyy-MM-dd")
    let month = format(date, "yyyy-MM")
    let first = cal.date(from: cal.dateComponents([.year, .month], from: date))!
    let gridStart = cal.date(byAdding: .day, value: -(cal.component(.weekday, from: first) - 1), to: first)!
    var unique: [String: WidgetItem] = [:]
    if payload?.signedIn == true {
      for item in (payload?.items ?? []) + (payload?.holidays ?? []) { unique[item.id] = item }
    }
    let items = unique.values.sorted {
      if $0.date != $1.date { return $0.date < $1.date }
      if $0.isAllDay != $1.isAllDay { return $0.isAllDay }
      if $0.startTime != $1.startTime { return ($0.startTime ?? "") < ($1.startTime ?? "") }
      return $0.title == $1.title ? $0.id < $1.id : $0.title < $1.title
    }
    let days = (0..<42).map { i -> WidgetDay in
      let value = cal.date(byAdding: .day, value: i, to: gridStart)!
      let key = format(value, "yyyy-MM-dd")
      var colors: [String] = []
      for item in items where item.date == key { if !colors.contains(item.colorKey) { colors.append(item.colorKey) } }
      return WidgetDay(date: key, day: cal.component(.day, from: value), inMonth: key.hasPrefix(month), isToday: key == day, colorKeys: colors)
    }
    let last = format(cal.date(byAdding: .day, value: 14, to: date)!, "yyyy-MM-dd")
    let signedIn = payload?.signedIn == true
    return WidgetSnapshot(generatedAt: payload?.generatedAt ?? "", singaporeDate: day, dateLabel: format(date, "EEE d MMMM"), signedIn: signedIn,
      month: WidgetMonth(year: cal.component(.year, from: date), month: cal.component(.month, from: date), label: format(date, "MMMM yyyy"), days: days),
      today: items.filter { $0.date == day }, upcoming: items.filter { $0.date > day && $0.date <= last },
      emptyText: signedIn ? "No events planned!" : "Open BubuDudu to view your calendar")
  }
}

struct CalendarProvider: TimelineProvider {
  func load() -> WidgetPayload? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "CalendarWidgetAppGroup") as? String,
      let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent("calendar-widget.json"),
      let data = try? Data(contentsOf: url), let value = try? JSONDecoder().decode(WidgetPayload.self, from: data), value.schemaVersion == 1 else { return nil }
    return value
  }
  func entry(_ date: Date, _ payload: WidgetPayload?) -> CalendarEntry {
    let key = SingaporeClock.format(date, "yyyy-MM-dd")
    let snapshot = payload?.timeline.first { $0.snapshot.singaporeDate == key }?.snapshot ?? SingaporeClock.snapshot(date, payload)
    let fallback = Bundle.main.object(forInfoDictionaryKey: "CalendarWidgetURL") as? String ?? "bubududu://calendar-widget"
    return CalendarEntry(date: date, snapshot: snapshot, calendarUrl: payload?.calendarUrl ?? fallback)
  }
  func placeholder(in context: Context) -> CalendarEntry { entry(Date(), nil) }
  func getSnapshot(in context: Context, completion: @escaping (CalendarEntry) -> Void) { completion(entry(Date(), context.isPreview ? nil : load())) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<CalendarEntry>) -> Void) {
    let payload = load()
    let now = Date()
    let cal = SingaporeClock.calendar
    let midnight = cal.startOfDay(for: now)
    var entries = [entry(now, payload)]
    for offset in 1..<35 { entries.append(entry(cal.date(byAdding: .day, value: offset, to: midnight)!, payload)) }
    completion(Timeline(entries: entries, policy: .after(cal.date(byAdding: .day, value: 35, to: midnight)!)))
  }
}

struct CalendarWidgetView: View {
  let entry: CalendarEntry
  @Environment(\.widgetFamily) var family
  var snapshot: WidgetSnapshot { entry.snapshot }
  var large: Bool { family == .systemLarge }
  var medium: Bool { family == .systemMedium }
  func itemURL(_ date: String) -> URL { URL(string: entry.calendarUrl + "?date=" + date)! }
  func font(_ size: CGFloat, bold: Bool = false) -> Font { .custom(bold ? "Raleway-Bold" : "Raleway-Regular", size: size) }

  var grid: some View {
    VStack(spacing: large ? 2 : 1) {
      HStack(spacing: 0) {
        ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { _, label in
          Text(label).font(font(9, bold: true)).frame(maxWidth: .infinity)
        }
      }
      ForEach(0..<6, id: \.self) { week in
        HStack(spacing: 1) {
          ForEach(Array(snapshot.month.days[(week * 7)..<(week * 7 + 7)])) { day in
            Link(destination: itemURL(day.date)) {
              VStack(spacing: 1) {
                Text("\(day.day)").font(font(large ? 12 : 8)).foregroundColor(day.inMonth ? WidgetPalette.darkGreenText : WidgetPalette.gray)
                HStack(spacing: 1) {
                  ForEach(Array(day.colorKeys.prefix(3)), id: \.self) { key in Circle().fill(WidgetPalette.semantic(key)).frame(width: 3, height: 3) }
                }.frame(height: 3)
              }.frame(maxWidth: .infinity).frame(height: large ? 20 : 13)
                .background(day.isToday ? WidgetPalette.yellow : Color.clear).cornerRadius(6)
            }
          }
        }
      }
    }
  }
  func rows(_ items: [WidgetItem], upcoming: Bool = false) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      ForEach(Array(items.prefix(large ? 1 : 2))) { item in
        if family == .systemSmall { row(item, upcoming: upcoming) }
        else { Link(destination: itemURL(item.date)) { row(item, upcoming: upcoming) } }
      }
    }
  }
  func row(_ item: WidgetItem, upcoming: Bool) -> some View {
    HStack(spacing: 6) {
      RoundedRectangle(cornerRadius: 2).fill(WidgetPalette.semantic(item.colorKey)).frame(width: 4)
      VStack(alignment: .leading, spacing: 2) {
        Text(item.title).font(font(12, bold: true)).lineLimit(1)
        Text((upcoming ? String(item.date.suffix(5)) + " · " : "") + item.timeLabel).font(font(10)).foregroundColor(WidgetPalette.brownText).lineLimit(1)
      }.frame(maxWidth: .infinity, alignment: .leading)
    }.frame(height: 28)
  }
  var today: some View {
    VStack(alignment: .leading, spacing: 5) {
      if medium || large { Text("Today").font(font(12, bold: true)) }
      if snapshot.today.isEmpty { Text(snapshot.emptyText).font(font(12)).fixedSize(horizontal: false, vertical: true) }
      else { rows(snapshot.today) }
    }.frame(maxWidth: .infinity, alignment: .leading)
  }
  var content: some View {
    VStack(alignment: .leading, spacing: large ? 9 : 7) {
      Text(medium || large ? snapshot.month.label : snapshot.dateLabel).font(font(large ? 18 : 14, bold: true)).lineLimit(1)
      if !snapshot.signedIn { Text(snapshot.emptyText).font(font(12)) }
      else if medium {
        HStack(alignment: .top, spacing: 12) { grid.frame(maxWidth: .infinity); today.frame(maxWidth: .infinity) }
      } else if large {
        grid
        today
        Text("Coming up").font(font(12, bold: true))
        rows(snapshot.upcoming, upcoming: true)
      } else { today }
      Spacer(minLength: 0)
    }.foregroundColor(WidgetPalette.darkGreenText).widgetURL(URL(string: entry.calendarUrl))
  }
  var body: some View {
    if #available(iOS 17.0, *) { content.containerBackground(WidgetPalette.backgroundPink, for: .widget) }
    else { content.padding(14).background(WidgetPalette.backgroundPink) }
  }
}

@main
struct BubuDuduCalendar: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "BubuDuduCalendar", provider: CalendarProvider()) { CalendarWidgetView(entry: $0) }
      .configurationDisplayName("BubuDudu Calendar")
      .description("Our plans and Singapore public holidays.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
