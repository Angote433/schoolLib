package com.arnold.mobileLib.data.model

data class BookCopy (
    val bookId: Int,
    val qrCode: String,
    val status: String,
    val dateAcquired: String?,
    val bookDetails: BookDetails?
    )