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
            return insets;
        });
    }
}
