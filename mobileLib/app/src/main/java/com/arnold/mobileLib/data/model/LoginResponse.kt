package com.arnold.mobileLib.data.model

data class LoginResponse (
    val token: String,
    val userId: Int,
    val fullName: String,
    val role: String,
    val userName: String,
    val streamId: Int?,
    val streamName: String?
)