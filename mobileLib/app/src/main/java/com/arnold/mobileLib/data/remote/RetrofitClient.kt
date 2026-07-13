package com.arnold.mobileLib.data.remote

import com.arnold.mobileLib.util.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    // Change this to your Railway URL when testing on real device
    // Use 10.0.2.2 for Android emulator (maps to localhost)
    // Use your actual PC IP for real device on same WiFi
    // e.g. http://192.168.1.100:8080/api/
    private const val BASE_URL = "http://192.168.0.3:8080/api/"

    private lateinit var sessionManager: SessionManager

    fun init(sessionManager: SessionManager) {
        this.sessionManager = sessionManager
    }

    // Auth interceptor — adds JWT token to every request
    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = sessionManager.getToken()

        val request = if (token != null) {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            original
        }

        chain.proceed(request)
    }

    // Logging interceptor — prints requests/responses in Logcat
    // Very helpful for debugging
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val instance: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}