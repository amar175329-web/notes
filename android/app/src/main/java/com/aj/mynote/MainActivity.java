package com.aj.mynote;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
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

        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setBackgroundDrawable(new ColorDrawable(Color.WHITE));
        window.setStatusBarColor(Color.WHITE);
        window.setNavigationBarColor(Color.WHITE);

        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(true);
            insetsController.setAppearanceLightNavigationBars(true);
        }

        setupNativeBars();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupNativeBars();
    }

    private void setupNativeBars() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setBars(final boolean isDark) {
                    runOnUiThread(() -> {
                        Window window = getWindow();
                        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                        int barColor = isDark ? Color.BLACK : Color.WHITE;
                        window.setStatusBarColor(barColor);
                        window.setNavigationBarColor(barColor);
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
                    });
                }
            }, "NativeBars");
        }
    }
}
