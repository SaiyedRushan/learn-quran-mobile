package app.learnquran.mobile;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 16 (API 36) enforces edge-to-edge and ignores the old
        // windowOptOutEdgeToEdgeEnforcement flag, so the WebView would draw
        // under the status and navigation bars. Inset the content by the
        // system-bar sizes and paint the exposed strips with the app's dark
        // background so the bars blend into the app.
        final View content = findViewById(android.R.id.content);
        content.setBackgroundColor(Color.parseColor("#1c1c1e"));
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);

            // Hand the WebView a copy with the bar and cutout insets zeroed.
            // The padding above has already moved it clear of both, but
            // Chromium derives env(safe-area-inset-*) from the insets it is
            // dispatched rather than from where it sits on screen: passed the
            // originals it reports a top inset the size of the display cutout,
            // and overrides/mobile.css pads the sticky header by that on top of
            // the padding here — a second status bar's worth of empty space
            // above the nav. Zeroing them here makes that rule the no-op on
            // Android it is documented to be, and leaves iOS (which gets its
            // real insets injected as --safe-area-inset-*) unaffected.
            //
            // Only these two types are cleared. The IME inset is passed through
            // untouched so the keyboard still resizes the page around a focused
            // input, and the padding above deliberately keeps ignoring the
            // cutout: on Android 14 and below the decor view has already inset
            // the content for the system bars by the time this runs, so adding
            // a cutout-sized pad here would reintroduce the same double gap on
            // exactly the devices the fix is meant to help.
            return new WindowInsetsCompat.Builder(insets)
                    .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.NONE)
                    .setInsets(WindowInsetsCompat.Type.displayCutout(), Insets.NONE)
                    .setDisplayCutout(null)
                    .build();
        });
    }
}
