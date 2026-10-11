import ExpoModulesCore
import WidgetKit

public class CalendarWidgetModule: Module {
  private var payloadURL: URL? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "CalendarWidgetAppGroup") as? String else { return nil }
    return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent("calendar-widget.json")
  }
  public func definition() -> ModuleDefinition {
    Name("BubuDuduCalendarWidget")
    Function("getCalendarURL") { Bundle.main.object(forInfoDictionaryKey: "CalendarWidgetURL") as? String }
    Function("setPayload") { (payload: String) in
      guard var url = self.payloadURL else { throw NSError(domain: "CalendarWidget", code: 1) }
      try Data(payload.utf8).write(to: url, options: .atomic)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      WidgetCenter.shared.reloadTimelines(ofKind: "BubuDuduCalendar")
    }
    Function("getPayload") { () -> String? in
      guard let url = self.payloadURL else { return nil }
      return try? String(contentsOf: url, encoding: .utf8)
    }
    Function("scheduleMidnight") { /* WidgetKit supplies the timeline clock. */ }
  }
}
