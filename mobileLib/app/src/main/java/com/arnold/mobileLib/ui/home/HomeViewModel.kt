package com.arnold.mobileLib.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.arnold.mobileLib.data.remote.RetrofitClient
import com.arnold.mobileLib.util.Resource
import kotlinx.coroutines.launch
import java.util.Calendar

class HomeViewModel : ViewModel() {

    private val _studentCount = MutableLiveData<Resource<Int>>()
    val studentCount: LiveData<Resource<Int>> = _studentCount

    private val _booksOut = MutableLiveData<Resource<Int>>()
    val booksOut: LiveData<Resource<Int>> = _booksOut

    fun loadStats(streamId: Int) {
        loadStudentCount(streamId)
        loadBooksOut(streamId)
    }

    private fun loadStudentCount(streamId: Int) {
        _studentCount.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance.getStudentsByStream(streamId)
                if (res.isSuccessful) {
                    val count = res.body()
                        ?.filter { it.isActive }?.size ?: 0
                    _studentCount.value = Resource.Success(count)
                } else {
                    _studentCount.value = Resource.Error("Failed")
                }
            } catch (e: Exception) {
                _studentCount.value = Resource.Error(e.message ?: "Error")
            }
        }
    }

    private fun loadBooksOut(streamId: Int) {
        _booksOut.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val year = Calendar.getInstance().get(Calendar.YEAR)
                val res = RetrofitClient.instance
                    .getStreamDistributions(streamId, year)
                if (res.isSuccessful) {
                    val count = res.body()
                        ?.filter { it.status == "DISTRIBUTED" }
                        ?.size ?: 0
                    _booksOut.value = Resource.Success(count)
                } else {
                    _booksOut.value = Resource.Error("Failed")
                }
            } catch (e: Exception) {
                _booksOut.value = Resource.Error(e.message ?: "Error")
            }
        }
    }
}