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

    // ISBN lookup result — teacher scanned the barcode on the back cover
    private val _isbnLookup = MutableLiveData<Resource<BookDetails>>()
    val isbnLookup: LiveData<Resource<BookDetails>> = _isbnLookup

    // Students in the teacher's stream currently holding a copy of the
    // scanned ISBN title — shown as a table during return
    private val _returnCandidates =
        MutableLiveData<Resource<List<DistributionRecord>>>()
    val returnCandidates: LiveData<Resource<List<DistributionRecord>>> =
        _returnCandidates

    // Teacher types/scans the accession number written inside the book
    fun lookupByAccession(accessionNumber: String) {
        _scannedBook.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance
                    .getBookByAccession(accessionNumber)
                if (res.isSuccessful) {
                    _scannedBook.value = Resource.Success(res.body()!!)
                } else if (res.code() == 404) {
                    _scannedBook.value = Resource.Error(
                        "No book with accession number: $accessionNumber\n" +
                        "Check the number written inside the book."
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

    // Teacher scans the ISBN barcode on the book's back cover (return flow)
    fun lookupByIsbn(isbn: String) {
        _isbnLookup.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance.getBookByIsbn(isbn)
                if (res.isSuccessful) {
                    _isbnLookup.value = Resource.Success(res.body()!!)
                } else if (res.code() == 404) {
                    _isbnLookup.value = Resource.Error(
                        "No book registered with ISBN: $isbn\n" +
                        "Ask the librarian to register this title first."
                    )
                } else {
                    _isbnLookup.value = Resource.Error("Lookup failed")
                }
            } catch (e: Exception) {
                _isbnLookup.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }

    fun loadReturnCandidatesByIsbn(isbn: String, streamId: Int) {
        _returnCandidates.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance
                    .getActiveByIsbnAndStream(isbn, streamId)
                if (res.isSuccessful) {
                    val records = res.body() ?: emptyList()
                    if (records.isEmpty()) {
                        _returnCandidates.value = Resource.Error(
                            "No students in your stream currently have this book"
                        )
                    } else {
                        _returnCandidates.value = Resource.Success(records)
                    }
                } else {
                    _returnCandidates.value =
                        Resource.Error("Failed to load")
                }
            } catch (e: Exception) {
                _returnCandidates.value =
                    Resource.Error("Network error: ${e.message}")
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

    fun assignByAccession(
        accessionNumber: String,
        studentId: Int,
        teacherId: Int
    ) {
        _actionResult.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val year = Calendar.getInstance().get(Calendar.YEAR)
                val res = RetrofitClient.instance.distributeByAccession(
                    AccessionDistributionRequest(
                        accessionNumber = accessionNumber,
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
        _isbnLookup.value = null
        _returnCandidates.value = null
    }
}