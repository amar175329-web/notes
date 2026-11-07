package com.aj.mynote;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.ActionMode;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.ImageView;
import android.widget.PopupWindow;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MYNOTE_ACTION_MODE";
    private boolean isCurrentDark = false;

    private void unsealHiddenApis() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                Method forName = Class.class.getDeclaredMethod("forName", String.class);
                Method getDeclaredMethod = Class.class.getDeclaredMethod("getDeclaredMethod", String.class, Class[].class);
                Class<?> vmRuntimeClass = (Class<?>) forName.invoke(null, "dalvik.system.VMRuntime");
                Method getRuntime = (Method) getDeclaredMethod.invoke(vmRuntimeClass, "getRuntime", (Class<?>[]) null);
                Method setHiddenApiExemptions = (Method) getDeclaredMethod.invoke(vmRuntimeClass, "setHiddenApiExemptions", new Class[]{String[].class});
                Object vmRuntime = getRuntime.invoke(null);
                setHiddenApiExemptions.invoke(vmRuntime, new Object[]{new String[]{"L"}});
                Log.d(TAG, "Hidden API restrictions unsealed successfully");
            } catch (Throwable t) {
                Log.w(TAG, "Hidden API unseal failed: " + t.getMessage());
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        unsealHiddenApis();
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
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

    private Object getFieldValue(Object obj, String fieldName) {
        if (obj == null) return null;
        Class<?> cls = obj.getClass();
        while (cls != null) {
            try {
                Field f = cls.getDeclaredField(fieldName);
                f.setAccessible(true);
                return f.get(obj);
            } catch (Throwable ignored) {
                cls = cls.getSuperclass();
            }
        }
        return null;
    }

    private void styleFloatingActionMode(final ActionMode mode) {
        if (mode == null) return;
        Log.d(TAG, "styleFloatingActionMode called! Mode: " + mode.getClass().getName());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Object toolbar = getFieldValue(mode, "mFloatingToolbar");
                Log.d(TAG, "toolbar: " + (toolbar != null ? toolbar.getClass().getName() : "null"));
                if (toolbar != null) {
                    Object popup = getFieldValue(toolbar, "mPopup");
                    Log.d(TAG, "popup: " + (popup != null ? popup.getClass().getName() : "null"));
                    if (popup != null) {
                        final int bgColor = isCurrentDark ? Color.parseColor("#1C1C1E") : Color.WHITE;

                        try {
                            Drawable dAbove = (Drawable) getFieldValue(popup, "mArrowAbove");
                            if (dAbove != null) dAbove.setTint(bgColor);
                        } catch (Throwable ignored) {}

                        try {
                            Drawable dBelow = (Drawable) getFieldValue(popup, "mArrowBelow");
                            if (dBelow != null) dBelow.setTint(bgColor);
                        } catch (Throwable ignored) {}

                        try {
                            PopupWindow pw = (PopupWindow) getFieldValue(popup, "mPopupWindow");
                            if (pw != null) {
                                pw.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                            }
                        } catch (Throwable ignored) {}

                        try {
                            View mp = (View) getFieldValue(popup, "mMainPanel");
                            if (mp != null) mp.setBackgroundColor(Color.TRANSPARENT);
                        } catch (Throwable ignored) {}

                        try {
                            View op = (View) getFieldValue(popup, "mOverflowPanel");
                            if (op != null) op.setBackgroundColor(Color.TRANSPARENT);
                        } catch (Throwable ignored) {}

                        final ViewGroup container = (ViewGroup) getFieldValue(popup, "mContentContainer");
                        Log.d(TAG, "container: " + (container != null ? container.getClass().getName() : "null"));
                        if (container != null) {
                            applyFloatingMenuStyles(container);
                            container.post(() -> applyFloatingMenuStyles(container));
                            container.postDelayed(() -> applyFloatingMenuStyles(container), 50);
                            container.postDelayed(() -> applyFloatingMenuStyles(container), 150);
                            container.postDelayed(() -> applyFloatingMenuStyles(container), 300);

                            container.addOnLayoutChangeListener((v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
                                applyFloatingMenuStyles(container);
                            });
                        }
                    }
                }
            } catch (Throwable t) {
                Log.e(TAG, "Error in styleFloatingActionMode", t);
            }
        }
    }

    private void applyFloatingMenuStyles(final ViewGroup container) {
        if (container == null) return;
        final int bgColor = isCurrentDark ? Color.parseColor("#1C1C1E") : Color.WHITE;
        final int strokeColor = isCurrentDark ? Color.parseColor("#2C2C2E") : Color.parseColor("#E2E8F0");
        final int targetTextColor = isCurrentDark ? Color.parseColor("#F5F5F7") : Color.parseColor("#14201F");

        float density = getResources().getDisplayMetrics().density;
        int cornerRadius = (int) (22 * density);
        int strokeWidth = Math.max(1, (int) (1 * density));

        GradientDrawable bgDrawable = new GradientDrawable();
        bgDrawable.setShape(GradientDrawable.RECTANGLE);
        bgDrawable.setCornerRadius(cornerRadius);
        bgDrawable.setColor(bgColor);
        bgDrawable.setStroke(strokeWidth, strokeColor);

        container.setBackground(bgDrawable);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            container.setElevation(8 * density);
            container.setClipToOutline(true);
        }

        styleViewGroupChildren(container, targetTextColor);
    }

    private void styleViewGroupChildren(ViewGroup group, int textColor) {
        for (int i = 0; i < group.getChildCount(); i++) {
            View child = group.getChildAt(i);
            if (child instanceof TextView) {
                TextView tv = (TextView) child;
                tv.setTextColor(textColor);
                tv.setBackgroundColor(Color.TRANSPARENT);
            } else if (child instanceof ImageView) {
                ((ImageView) child).setColorFilter(textColor);
            } else if (child instanceof ViewGroup) {
                child.setBackgroundColor(Color.TRANSPARENT);
                styleViewGroupChildren((ViewGroup) child, textColor);
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
