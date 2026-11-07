package com.aj.mynote;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.lang.reflect.Field;

public class MainActivity extends BridgeActivity {
    private boolean isCurrentDark = false;

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
        setupBackDispatcher();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupNativeBars();
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        super.onActionModeStarted(mode);
        styleFloatingActionMode(mode);
    }

    private void styleFloatingActionMode(final ActionMode mode) {
        if (mode == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Field f = mode.getClass().getDeclaredField("mFloatingToolbar");
                f.setAccessible(true);
                Object toolbar = f.get(mode);
                if (toolbar != null) {
                    Field popupField = toolbar.getClass().getDeclaredField("mPopup");
                    popupField.setAccessible(true);
                    Object popup = popupField.get(toolbar);
                    if (popup != null) {
                        Field contentField = popup.getClass().getDeclaredField("mContentContainer");
                        contentField.setAccessible(true);
                        final ViewGroup container = (ViewGroup) contentField.get(popup);
                        if (container != null) {
                            applyFloatingMenuStyles(container);
                            container.post(() -> applyFloatingMenuStyles(container));
                            container.postDelayed(() -> applyFloatingMenuStyles(container), 80);
                        }
                    }
                }
            } catch (Throwable ignored) {
            }
        }
    }

    private void applyFloatingMenuStyles(ViewGroup group) {
        if (group == null) return;
        final int darkColor = Color.parseColor("#14201F");
        final int lightColor = Color.parseColor("#F5F5F7");
        final int targetColor = isCurrentDark ? lightColor : darkColor;

        for (int i = 0; i < group.getChildCount(); i++) {
            View child = group.getChildAt(i);
            if (child instanceof TextView) {
                TextView tv = (TextView) child;
                tv.setTextColor(targetColor);
                tv.setBackgroundColor(Color.TRANSPARENT);
            } else if (child instanceof ImageView) {
                ((ImageView) child).setColorFilter(targetColor);
            } else if (child instanceof ViewGroup) {
                applyFloatingMenuStyles((ViewGroup) child);
            }
        }
    }

    private void setupBackDispatcher() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.evaluateJavascript("window.onAndroidBack ? window.onAndroidBack() : false", value -> {
                        if ("false".equals(value)) {
                            finish();
                        }
                    });
                } else {
                    finish();
                }
            }
        });
    }

    private void applyThemeBars(final boolean isDark) {
        isCurrentDark = isDark;
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        WindowCompat.setDecorFitsSystemWindows(window, false);

        int barColor = isDark ? Color.BLACK : Color.WHITE;
        window.setStatusBarColor(Color.TRANSPARENT);
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

                @JavascriptInterface
                public void exitApp() {
                    runOnUiThread(MainActivity.this::finish);
                }
            }, "NativeBars");
        }
    }
}
