package com.arnold.mobileLib.data.model

import com.google.gson.annotations.SerializedName

data class Student (
    val studentId: Int,
    val admissionNumber: String,
    val fullName: String,
    val yearEnrolled: Int,
    @SerializedName("active")
    val isActive: Boolean,
    val stream: StreamInfo?
)