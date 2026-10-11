package expo.modules.calendarwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.AtomicFile
import androidx.work.*
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar
import java.util.TimeZone
import java.util.concurrent.TimeUnit
import java.io.File

private const val WORK_NAME = "BubuDuduCalendarMidnight"

fun scheduleCalendarMidnight(context: Context) {
  val now = System.currentTimeMillis()
  val midnight = Calendar.getInstance(TimeZone.getTimeZone("Asia/Singapore")).apply {
    timeInMillis = now
    add(Calendar.DAY_OF_MONTH, 1)
    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
  }
  val work = OneTimeWorkRequestBuilder<CalendarMidnightWorker>()
    .setInitialDelay(midnight.timeInMillis - now, TimeUnit.MILLISECONDS).build()
  WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, work)
}

class CalendarMidnightWorker(context: Context, params: WorkerParameters): Worker(context, params) {
  override fun doWork(): Result {
    val component = ComponentName(applicationContext.packageName, applicationContext.packageName + ".widget.BubuDuduCalendar")
    val manager = AppWidgetManager.getInstance(applicationContext)
    val ids = manager.getAppWidgetIds(component)
    if (ids.isNotEmpty()) {
      applicationContext.sendBroadcast(Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
        setComponent(component)
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      })
    }
    // The headless widget task schedules the next midnight after this worker
    // completes, avoiding cancellation of the currently running unique work.
    return Result.success()
  }
}

class CalendarWidgetModule: Module() {
  override fun definition() = ModuleDefinition {
    Name("BubuDuduCalendarWidget")
    Function("getCalendarURL") {
      val context = requireNotNull(appContext.reactContext)
      val resource = context.resources.getIdentifier("calendar_widget_url", "string", context.packageName)
      if (resource != 0) context.getString(resource) else null
    }
    Function("setPayload") { payload: String ->
      val context = requireNotNull(appContext.reactContext)
      val file = AtomicFile(File(context.noBackupFilesDir, "calendar-widget.json"))
      val output = file.startWrite()
      try { output.write(payload.toByteArray(Charsets.UTF_8)); file.finishWrite(output) }
      catch (error: Exception) { file.failWrite(output); throw error }
    }
    Function("getPayload") {
      val file = AtomicFile(File(requireNotNull(appContext.reactContext).noBackupFilesDir, "calendar-widget.json"))
      if (file.baseFile.exists()) String(file.readFully(), Charsets.UTF_8) else null
    }
    Function("scheduleMidnight") { scheduleCalendarMidnight(requireNotNull(appContext.reactContext)) }
  }
}
