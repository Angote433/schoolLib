package com.arnold.mobileLib.data.model

data class AccessionDistributionRequest(
    val accessionNumber: String,
    val studentId: Int,
    val academicYear: Int,
    val teacherId: Int
)
