package com.varun.codefactory.gamecontroller.util;

import android.content.Context;
import android.content.SharedPreferences;

public final class Prefs {
    public static SharedPreferences get(Context context) {
        return context.getSharedPreferences("GAMECONTROLLER_PREFS", 0);
    }
}
