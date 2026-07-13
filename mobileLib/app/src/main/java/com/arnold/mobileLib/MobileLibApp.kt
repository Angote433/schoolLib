package com.arnold.mobileLib

import android.app.Application
import com.arnold.mobileLib.data.remote.RetrofitClient
import com.arnold.mobileLib.util.SessionManager

class MobileLibApp : Application() {

    lateinit var sessionManager: SessionManager

    override fun onCreate() {
        super.onCreate()
        // Initialize SessionManager with application context
        sessionManager = SessionManager(applicationContext)
        // Pass it to RetrofitClient so auth interceptor works
        RetrofitClient.init(sessionManager)
    }
}