package com.arnold.mobileLib.ui.scan

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.arnold.mobileLib.data.model.*
import com.arnold.mobileLib.data.remote.RetrofitClient
import com.arnold.mobileLib.util.Resource
import kotlinx.coroutines.launch
import java.util.Calendar

class ScanViewModel : ViewModel() {

    private val _scannedBook = MutableLiveData<Resource<BookCopy>>()
    val scannedBook: LiveData<Resource<BookCopy>> = _scannedBook

    private val _students = MutableLiveData<List<Student>>()
    val students: LiveData<List<Student>> = _students

    private val _actionResult = MutableLiveData<Resource<String>>()
    val actionResult: LiveData<Resource<String>> = _actionResult

    private var allStudents: List<Student> = emptyList()

    // Active distribution for the scanned book (return mode)
    private val _activeDistribution =
        MutableLiveData<DistributionRecord?>()
    val activeDistribution: LiveData<DistributionRecord?> =
        _activeDistribution

    fun lookupBook(qrCode: String) {
        _scannedBook.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance.scanBook(qrCode)
                if (res.isSuccessful) {
                    _scannedBook.value = Resource.Success(res.body()!!)
                } else if (res.code() == 404) {
                    _scannedBook.value = Resource.Error(
                        "No book found with this barcode"
                    )
                } else {
                    _scannedBook.value = Resource.Error("Lookup failed")
                }
            } catch (e: Exception) {
                _scannedBook.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }

    fun loadStudents(streamId: Int) {
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance
                    .getStudentsByStream(streamId)
                if (res.isSuccessful) {
                    allStudents = res.body()
                        ?.filter { it.isActive } ?: emptyList()
                    _students.value = allStudents
                }
            } catch (e: Exception) {
                // Silently fail — students list just stays empty
            }
        }
    }

    fun searchStudents(query: String) {
        _students.value = if (query.isBlank()) {
            allStudents
        } else {
            allStudents.filter { s ->
                s.fullName.contains(query, ignoreCase = true) ||
                        s.admissionNumber.contains(query, ignoreCase = true)
            }
        }
    }

    fun loadActiveDistribution(streamId: Int, qrCode: String) {
        viewModelScope.launch {
            try {
                val year = Calendar.getInstance().get(Calendar.YEAR)
                val res = RetrofitClient.instance
                    .getStreamDistributions(streamId, year)
                if (res.isSuccessful) {
                    val dist = res.body()?.find { record ->
                        record.bookCopy?.qrCode == qrCode &&
                                record.status == "DISTRIBUTED"
                    }
                    _activeDistribution.value = dist
                }
            } catch (e: Exception) {
                _activeDistribution.value = null
            }
        }
    }

    fun assignBook(qrCode: String, studentId: Int, teacherId: Int) {
        _actionResult.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val year = Calendar.getInstance().get(Calendar.YEAR)
                val res = RetrofitClient.instance.distributeBook(
                    DistributionRequest(
                        qrCode = qrCode,
                        studentId = studentId,
                        academicYear = year,
                        teacherId = teacherId
                    )
                )
                if (res.isSuccessful) {
                    _actionResult.value = Resource.Success(
                        "Book assigned successfully ✅"
                    )
                } else {
                    val err = res.errorBody()?.string()
                    _actionResult.value = Resource.Error(
                        err ?: "Failed to assign book"
                    )
                }
            } catch (e: Exception) {
                _actionResult.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }

    fun returnBook(qrCode: String) {
        _actionResult.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance.returnBook(qrCode)
                if (res.isSuccessful) {
                    _actionResult.value = Resource.Success(
                        "Book returned successfully ✅"
                    )
                } else {
                    val err = res.errorBody()?.string()
                    _actionResult.value = Resource.Error(
                        err ?: "Failed to return book"
                    )
                }
            } catch (e: Exception) {
                _actionResult.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }

    fun clearState() {
        _scannedBook.value = null
        _activeDistribution.value = null
        _actionResult.value = null
    }
}