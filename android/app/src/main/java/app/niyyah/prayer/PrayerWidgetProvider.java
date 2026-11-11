package app.niyyah.prayer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Home-screen widget: the current prayer window, a live countdown to its end
 * (or to the next adhan once it has been logged) and today's five times.
 *
 * The web app pushes a precomputed schedule through {@link WidgetBridgePlugin};
 * this class only locates "now" in it. The countdown is a Chronometer, which the
 * launcher ticks by itself, and one alarm wakes us at the next boundary
 * (window end, amber threshold, next adhan) to redraw.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {

    static final String ACTION_REFRESH = "app.niyyah.prayer.WIDGET_REFRESH";
    private static final String PREFS = "niyyah_widget";
    private static final String KEY_SCHEDULE = "schedule";

    /** Under this much time left, the window turns amber, matching the app. */
    private static final long AMBER_MS = 20 * 60_000L;
    /** Redraw at least this often so the progress bar keeps moving. */
    private static final long MAX_IDLE_MS = 15 * 60_000L;
    /** Below this height (dp) the widget shows the headline only. */
    private static final int COMPACT_HEIGHT_DP = 100;

    private static final int[] ROW_NAME_IDS = {
        R.id.w_n0, R.id.w_n1, R.id.w_n2, R.id.w_n3, R.id.w_n4,
    };
    private static final int[] ROW_TIME_IDS = {
        R.id.w_t0, R.id.w_t1, R.id.w_t2, R.id.w_t3, R.id.w_t4,
    };

    // ---- Public entry points --------------------------------------------------

    static void saveSchedule(Context context, String json) {
        prefs(context).edit().putString(KEY_SCHEDULE, json).apply();
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        if (ids == null || ids.length == 0) {
            cancelRefresh(context);
            return;
        }
        long nextBoundary = Long.MAX_VALUE;
        for (int id : ids) {
            nextBoundary = Math.min(nextBoundary, render(context, manager, id));
        }
        scheduleRefresh(context, nextBoundary);
    }

    // ---- AppWidgetProvider ----------------------------------------------------

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        refreshAll(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        refreshAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        cancelRefresh(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;
        switch (action) {
            case ACTION_REFRESH:
            case Intent.ACTION_BOOT_COMPLETED:
            case Intent.ACTION_TIME_CHANGED:
            case Intent.ACTION_TIMEZONE_CHANGED:
            case Intent.ACTION_MY_PACKAGE_REPLACED:
                // Chronometer bases are tied to elapsedRealtime, which resets on
                // reboot and drifts from wall time when the clock is changed.
                refreshAll(context);
                break;
            default:
                break;
        }
    }

    // ---- Rendering ------------------------------------------------------------

    private static final class Slot {
        String key;
        String name;
        String arabic;
        long start;
        long end;
        String time;
        String status;
    }

    /** Labels in the app's language, sent with the schedule; English when missing. */
    private static JSONObject labels = null;

    private static String label(String key, String fallback) {
        return labels != null ? labels.optString(key, fallback) : fallback;
    }

    /** Draws one widget and returns the wall-clock time it next needs redrawing. */
    private static long render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer);
        views.setOnClickPendingIntent(R.id.w_root, openAppIntent(context));

        long now = System.currentTimeMillis();
        String place = "";
        boolean coarse = false;
        Slot current = null;
        Slot next = null;
        Slot[] row = null;

        try {
            String json = prefs(context).getString(KEY_SCHEDULE, null);
            if (json != null) {
                JSONObject root = new JSONObject(json);
                place = root.optString("place", "");
                coarse = root.optBoolean("coarse", false);
                labels = root.optJSONObject("labels");
                JSONArray days = root.getJSONArray("days");
                for (int d = 0; d < days.length() && next == null; d++) {
                    JSONArray slots = days.getJSONObject(d).getJSONArray("slots");
                    Slot[] parsed = new Slot[slots.length()];
                    for (int i = 0; i < slots.length(); i++) parsed[i] = parse(slots.getJSONObject(i));
                    for (Slot slot : parsed) {
                        if (current == null && now >= slot.start && now < slot.end) {
                            current = slot;
                            row = parsed;
                        } else if (slot.start > now && next == null) {
                            next = slot;
                        }
                    }
                }
            }
        } catch (JSONException ignored) {
            current = null;
        }

        if (current == null || row == null) {
            showEmpty(views, context);
            manager.updateAppWidget(widgetId, views);
            return Long.MAX_VALUE;
        }

        views.setViewVisibility(R.id.w_content, View.VISIBLE);
        views.setViewVisibility(R.id.w_empty, View.GONE);

        String nowLabel = label("now", "Now");
        views.setTextViewText(R.id.w_label, place.isEmpty() ? nowLabel : nowLabel + " · " + place);
        views.setTextViewText(R.id.w_name, current.name);
        views.setTextViewText(R.id.w_arabic, current.arabic);

        long boundary = now + MAX_IDLE_MS;
        long left = current.end - now;
        boolean logged = current.status != null;
        boolean amber = !logged && left <= AMBER_MS;

        int ink = color(context, R.color.widget_ink);
        int ink2 = color(context, R.color.widget_ink_2);
        int accent = color(context, R.color.widget_accent);
        int amberColor = color(context, R.color.widget_amber);

        // Headline countdown. A logged window no longer has a deadline worth
        // racing, so count to the next adhan instead.
        long target;
        String format;
        if (logged && next != null) {
            target = next.start;
            format = label("nextIn", "{name} in %s").replace("{name}", next.name);
            views.setTextViewText(R.id.w_status, statusLabel(current.status));
            views.setViewVisibility(R.id.w_status, View.VISIBLE);
            boundary = Math.min(boundary, next.start);
        } else {
            target = current.end;
            format = label("left", "%s left");
            views.setViewVisibility(R.id.w_status, View.GONE);
            if (!amber) boundary = Math.min(boundary, current.end - AMBER_MS);
        }
        boundary = Math.min(boundary, current.end);

        if (coarse) {
            // Minutes-only: static text, redrawn once a minute. No ticking seconds.
            views.setViewVisibility(R.id.w_timer, View.GONE);
            views.setViewVisibility(R.id.w_timer_text, View.VISIBLE);
            views.setTextViewText(R.id.w_timer_text, String.format(format, coarseLeft(target - now)));
            views.setTextColor(R.id.w_timer_text, amber ? amberColor : ink);
            boundary = Math.min(boundary, now + 60_000L - (now % 60_000L));
        } else {
            views.setViewVisibility(R.id.w_timer_text, View.GONE);
            views.setViewVisibility(R.id.w_timer, View.VISIBLE);
            long base = SystemClock.elapsedRealtime() + (target - now);
            views.setChronometer(R.id.w_timer, base, format, true);
            views.setChronometerCountDown(R.id.w_timer, true);
            views.setTextColor(R.id.w_timer, amber ? amberColor : ink);
        }

        // Progress through the window.
        long span = Math.max(1, current.end - current.start);
        int progress = (int) Math.max(0, Math.min(1000, ((now - current.start) * 1000) / span));
        views.setProgressBar(R.id.w_bar, 1000, progress, false);
        views.setProgressBar(R.id.w_bar_amber, 1000, progress, false);
        views.setViewVisibility(R.id.w_bar, amber ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.w_bar_amber, amber ? View.VISIBLE : View.GONE);

        // Today's five times, current one highlighted, logged ones ticked.
        for (int i = 0; i < ROW_NAME_IDS.length; i++) {
            if (i >= row.length) {
                views.setViewVisibility(ROW_NAME_IDS[i], View.GONE);
                views.setViewVisibility(ROW_TIME_IDS[i], View.GONE);
                continue;
            }
            Slot slot = row[i];
            boolean isCurrent = slot.key.equals(current.key);
            String name = slot.status != null ? "✓ " + slot.name : slot.name;
            views.setTextViewText(ROW_NAME_IDS[i], name);
            views.setTextViewText(ROW_TIME_IDS[i], slot.time);
            views.setTextColor(ROW_NAME_IDS[i], isCurrent ? accent : ink2);
            views.setTextColor(ROW_TIME_IDS[i], isCurrent ? accent : ink);
        }

        boolean compact = heightDp(manager, widgetId) < COMPACT_HEIGHT_DP;
        views.setViewVisibility(R.id.w_row, compact ? View.GONE : View.VISIBLE);

        manager.updateAppWidget(widgetId, views);
        return Math.max(now + 1000, boundary);
    }

    /** "1 h 05 min", "12 min", "under a minute" — matches fmtLeft() in the app. */
    private static String coarseLeft(long ms) {
        if (ms < 60_000L) return label("under", "under a minute");
        long minutes = (ms + 59_999L) / 60_000L;
        long h = minutes / 60;
        long m = minutes % 60;
        if (h > 0) {
            return m > 0
                ? String.format(java.util.Locale.US, label("hm", "%d h %02d min"), h, m)
                : String.format(java.util.Locale.US, label("h", "%d h"), h);
        }
        return String.format(java.util.Locale.US, label("m", "%d min"), m);
    }

    private static void showEmpty(RemoteViews views, Context context) {
        views.setViewVisibility(R.id.w_content, View.GONE);
        views.setViewVisibility(R.id.w_empty, View.VISIBLE);
        views.setTextViewText(R.id.w_empty, context.getString(R.string.widget_empty));
    }

    private static Slot parse(JSONObject o) throws JSONException {
        Slot slot = new Slot();
        slot.key = o.getString("k");
        slot.name = o.getString("n");
        slot.arabic = o.optString("a", "");
        slot.start = o.getLong("s");
        slot.end = o.getLong("e");
        slot.time = o.optString("t", "");
        slot.status = o.has("st") && !o.isNull("st") ? o.getString("st") : null;
        return slot;
    }

    private static String statusLabel(String status) {
        switch (status) {
            case "ontime":
                return label("ontime", "Prayed");
            case "late":
                return label("late", "Prayed late");
            case "missed":
                return label("missed", "Not today");
            default:
                return "";
        }
    }

    private static int heightDp(AppWidgetManager manager, int widgetId) {
        Bundle options = manager.getAppWidgetOptions(widgetId);
        if (options == null) return Integer.MAX_VALUE;
        int min = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        return min > 0 ? min : Integer.MAX_VALUE;
    }

    // ---- Plumbing -------------------------------------------------------------

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static int color(Context context, int id) {
        return ContextCompat.getColor(context, id);
    }

    private static PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refreshIntent(Context context) {
        Intent intent = new Intent(context, PrayerWidgetProvider.class).setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * Non-waking alarm: if the screen is off nobody is looking at the widget, and
     * the alarm is delivered as soon as the device wakes.
     */
    private static void scheduleRefresh(Context context, long at) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent pending = refreshIntent(context);
        if (at == Long.MAX_VALUE) {
            alarms.cancel(pending);
            return;
        }
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        try {
            if (exact) alarms.setExact(AlarmManager.RTC, at, pending);
            else alarms.set(AlarmManager.RTC, at, pending);
        } catch (SecurityException denied) {
            alarms.set(AlarmManager.RTC, at, pending);
        }
    }

    private static void cancelRefresh(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(refreshIntent(context));
    }
}
