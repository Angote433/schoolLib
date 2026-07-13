package com.arnold.mobileLib.data.model

data class DistributionRecord (
    val distributionId: Int,
    val bookCopy: BookCopy?,
    val student: Student?,
    val dateDistributed: String,
    val dateReturned: String?,
    val academicYear: Int,
    val status: String

    )