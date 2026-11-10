package app.niyyah.prayer;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Receives the precomputed prayer schedule from the web app for the home-screen widget. */
@CapacitorPlugin(name = "NiyyahWidget")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("Missing json");
            return;
        }
        PrayerWidgetProvider.saveSchedule(getContext(), json);
        PrayerWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
