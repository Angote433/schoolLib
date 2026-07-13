package com.arnold.mobileLib.data.model

data class BookDetails (
    val detailsId: Int,
    val titleName: String,
    val subject: String,
    val gradeLevel: Int,
    val publisher: String?,
    val isbn: String?
)