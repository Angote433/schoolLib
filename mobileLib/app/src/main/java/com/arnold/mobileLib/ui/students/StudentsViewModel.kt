package com.arnold.mobileLib.ui.students

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.arnold.mobileLib.data.model.AddStudentRequest
import com.arnold.mobileLib.data.model.Student
import com.arnold.mobileLib.data.remote.RetrofitClient
import com.arnold.mobileLib.util.Resource
import kotlinx.coroutines.launch
import java.util.Calendar

class StudentsViewModel : ViewModel() {

    private val _students = MutableLiveData<Resource<List<Student>>>()
    val students: LiveData<Resource<List<Student>>> = _students

    private val _addResult = MutableLiveData<Resource<Student>>()
    val addResult: LiveData<Resource<Student>> = _addResult

    // Full list — used for local search filtering
    private var allStudents: List<Student> = emptyList()

    fun loadStudents(streamId: Int) {
        _students.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance
                    .getStudentsByStream(streamId)
                if (res.isSuccessful) {
                    allStudents = res.body() ?: emptyList()
                    _students.value = Resource.Success(allStudents)
                } else {
                    _students.value = Resource.Error("Failed to load students")
                }
            } catch (e: Exception) {
                _students.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }

    // Filter locally — no API call needed
    fun search(query: String) {
        if (query.isBlank()) {
            _students.value = Resource.Success(allStudents)
            return
        }
        val filtered = allStudents.filter { student ->
            student.fullName.contains(query, ignoreCase = true) ||
                    student.admissionNumber.contains(query, ignoreCase = true)
        }
        _students.value = Resource.Success(filtered)
    }

    fun addStudent(
        streamId: Int,
        admissionNumber: String,
        fullName: String,
        yearEnrolled: Int
    ) {
        if (admissionNumber.isBlank()) {
            _addResult.value = Resource.Error("Admission number is required")
            return
        }
        if (fullName.isBlank()) {
            _addResult.value = Resource.Error("Full name is required")
            return
        }

        _addResult.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance.addStudent(
                    streamId = streamId,
                    student = AddStudentRequest(
                        admissionNumber = admissionNumber,
                        fullName = fullName,
                        yearEnrolled = yearEnrolled
                    )
                )
                if (res.isSuccessful) {
                    _addResult.value = Resource.Success(res.body()!!)
                    // Reload the list
                    loadStudents(streamId)
                } else {
                    val errorBody = res.errorBody()?.string()
                    _addResult.value = Resource.Error(
                        errorBody ?: "Failed to add student"
                    )
                }
            } catch (e: Exception) {
                _addResult.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }
}