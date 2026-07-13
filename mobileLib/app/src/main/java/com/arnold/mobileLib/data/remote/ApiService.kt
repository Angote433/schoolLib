package com.arnold.mobileLib.data.remote

import com.arnold.mobileLib.data.model.*
import retrofit2.Response
import retrofit2.http.*

// ApiService defines all the API endpoints the app uses
// Retrofit reads these annotations and builds the HTTP calls
// suspend = runs on a coroutine — does not block the UI thread
interface ApiService {

    // AUTH
    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    // STUDENTS
    @GET("students/stream/{streamId}")
    suspend fun getStudentsByStream(
        @Path("streamId") streamId: Int
    ): Response<List<Student>>

    @POST("students")
    suspend fun addStudent(
        @Query("streamId") streamId: Int,
        @Body student: AddStudentRequest
    ): Response<Student>

    // BOOKS
    @GET("books/scan/{qrCode}")
    suspend fun scanBook(
        @Path("qrCode") qrCode: String
    ): Response<BookCopy>

    @GET("books/isbn/{isbn}")
    suspend fun getBookByIsbn(
        @Path("isbn") isbn: String
    ): Response<BookDetails>

    @GET("books/accession/{accessionNumber}")
    suspend fun getBookByAccession(
        @Path("accessionNumber") accessionNumber: String
    ): Response<BookCopy>

    //  DISTRIBUTIONS
    @POST("distributions")
    suspend fun distributeBook(
        @Body request: DistributionRequest
    ): Response<DistributionRecord>

    @PUT("distributions/return/{qrCode}")
    suspend fun returnBook(
        @Path("qrCode") qrCode: String
    ): Response<DistributionRecord>

    @GET("distributions/stream/{streamId}/year/{year}")
    suspend fun getStreamDistributions(
        @Path("streamId") streamId: Int,
        @Path("year") year: Int
    ): Response<List<DistributionRecord>>

    @GET("distributions/isbn/{isbn}/stream/{streamId}")
    suspend fun getActiveByIsbnAndStream(
        @Path("isbn") isbn: String,
        @Path("streamId") streamId: Int
    ): Response<List<DistributionRecord>>

    @POST("distributions/by-accession")
    suspend fun distributeByAccession(
        @Body request: AccessionDistributionRequest
    ): Response<DistributionRecord>

    @POST("distributions/loss")
    suspend fun flagLost(
        @Body request: LossRequest
    ): Response<Any>
}