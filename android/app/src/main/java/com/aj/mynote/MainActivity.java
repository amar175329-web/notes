package com.aj.mynote;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        final long startTime = System.currentTimeMillis();
        final long splashDuration = 900L; // 0.9s duration as requested

        splashScreen.setKeepOnScreenCondition(() -> {
            long elapsed = System.currentTimeMillis() - startTime;
            return elapsed < splashDuration;
        });

        splashScreen.setOnExitAnimationListener(splashScreenViewProvider -> {
            View splashView = splashScreenViewProvider.getView();
            splashView.animate()
                .alpha(0f)
                .setDuration(180L)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .withEndAction(splashScreenViewProvider::remove)
                .start();
        });

        applyThemeBars(false);
        setupNativeBars();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupNativeBars();
    }

    private void applyThemeBars(final boolean isDark) {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        WindowCompat.setDecorFitsSystemWindows(window, false);

        int barColor = isDark ? Color.BLACK : Color.WHITE;
        window.setStatusBarColor(barColor);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(Color.TRANSPARENT);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        window.setBackgroundDrawable(new ColorDrawable(barColor));
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(barColor);
        }

        WindowInsetsControllerCompat insets =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (insets != null) {
            insets.setAppearanceLightStatusBars(!isDark);
            insets.setAppearanceLightNavigationBars(!isDark);
        }
    }

    private void setupNativeBars() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setBars(final boolean isDark) {
                    runOnUiThread(() -> applyThemeBars(isDark));
                }
            }, "NativeBars");
        }
    }
}
