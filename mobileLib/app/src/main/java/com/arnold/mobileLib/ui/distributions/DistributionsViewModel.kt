package com.arnold.mobileLib.ui.distributions

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.arnold.mobileLib.data.model.DistributionRecord
import com.arnold.mobileLib.data.remote.RetrofitClient
import com.arnold.mobileLib.util.Resource
import kotlinx.coroutines.launch
import java.util.Calendar

class DistributionsViewModel : ViewModel() {

    private val _distributions =
        MutableLiveData<Resource<List<DistributionRecord>>>()
    val distributions: LiveData<Resource<List<DistributionRecord>>> =
        _distributions

    private val _flagResult = MutableLiveData<Resource<String>>()
    val flagResult: LiveData<Resource<String>> = _flagResult

    fun loadDistributions(streamId: Int) {
        _distributions.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val year = Calendar.getInstance().get(Calendar.YEAR)
                val res = RetrofitClient.instance
                    .getStreamDistributions(streamId, year)
                if (res.isSuccessful) {
                    val active = res.body()
                        ?.filter { it.status == "DISTRIBUTED" }
                        ?: emptyList()
                    _distributions.value = Resource.Success(active)
                } else {
                    _distributions.value =
                        Resource.Error("Failed to load")
                }
            } catch (e: Exception) {
                _distributions.value =
                    Resource.Error("Network error: ${e.message}")
            }
        }
    }

    fun flagAsLost(
        qrCode: String,
        reason: String,
        teacherId: Int,
        streamId: Int
    ) {
        _flagResult.value = Resource.Loading()
        viewModelScope.launch {
            try {
                val res = RetrofitClient.instance.flagLost(
                    com.arnold.mobileLib.data.model.LossRequest(
                        qrCode = qrCode,
                        reason = reason,
                        teacherId = teacherId
                    )
                )
                if (res.isSuccessful) {
                    _flagResult.value = Resource.Success(
                        "Book flagged as lost. Loss report created."
                    )
                    // Reload the list
                    loadDistributions(streamId)
                } else {
                    val err = res.errorBody()?.string()
                    _flagResult.value = Resource.Error(
                        err ?: "Failed to flag as lost"
                    )
                }
            } catch (e: Exception) {
                _flagResult.value = Resource.Error(
                    "Network error: ${e.message}"
                )
            }
        }
    }
}