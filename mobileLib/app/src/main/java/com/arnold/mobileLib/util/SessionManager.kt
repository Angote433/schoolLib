package com.arnold.mobileLib.util

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(
        PREF_NAME, Context.MODE_PRIVATE
    )

    companion object {
        private const val PREF_NAME = "SchoolLibrarySession"
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_NAME = "full_name"
        private const val KEY_ROLE = "role"
        private const val KEY_USERNAME = "username"
        private const val KEY_STREAM_ID = "stream_id"
        private const val KEY_STREAM_NAME = "stream_name"
    }

    fun saveSession(
        token: String, userId: Int,
        fullName: String, role: String,
        userName: String, streamId: Int?,
        streamName: String?
    ) {
        prefs.edit().apply {
            putString(KEY_TOKEN, token)
            putInt(KEY_USER_ID, userId)
            putString(KEY_NAME, fullName)
            putString(KEY_ROLE, role)
            putString(KEY_USERNAME, userName)
            putInt(KEY_STREAM_ID, streamId ?: -1)
            putString(KEY_STREAM_NAME, streamName)
            apply()
        }
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, -1)

    fun getFullName(): String? = prefs.getString(KEY_NAME, null)

    fun getRole(): String? = prefs.getString(KEY_ROLE, null)

    fun getStreamId(): Int? {
        val id = prefs.getInt(KEY_STREAM_ID, -1)
        return if (id == -1) null else id
    }

    fun getStreamName(): String? =
        prefs.getString(KEY_STREAM_NAME, null)

    fun isLoggedIn(): Boolean = getToken() != null

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}