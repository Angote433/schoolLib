package com.arnold.mobileLib.data.model

data class Student (
    val studentId: Int,
    val admissionNumber: String,
    val fullName: String,
    val yearEnrolled: Int,
    val isActive: Boolean,
    val stream: StreamInfo?
)