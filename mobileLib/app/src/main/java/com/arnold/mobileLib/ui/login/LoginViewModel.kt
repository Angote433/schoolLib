package com.arnold.mobileLib.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.arnold.mobileLib.data.model.LoginRequest
import com.arnold.mobileLib.data.model.LoginResponse
import com.arnold.mobileLib.data.remote.RetrofitClient
import com.arnold.mobileLib.util.Resource
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {

    // LiveData that the Activity observes
    // When this changes the UI updates automatically
    private val _loginResult = MutableLiveData<Resource<LoginResponse>>()
    val loginResult: LiveData<Resource<LoginResponse>> = _loginResult

    fun login(username: String, password: String) {

        // Basic validation before hitting the API
        if (username.isBlank()) {
            _loginResult.value = Resource.Error("Username cannot be empty")
            return
        }
        if (password.isBlank()) {
            _loginResult.value = Resource.Error("Password cannot be empty")
            return
        }

        // Set loading state — UI shows progress bar
        _loginResult.value = Resource.Loading()

        // Launch coroutine — runs API call off the main thread
        viewModelScope.launch {
            try {
                val response = RetrofitClient.instance.login(
                    LoginRequest(username, password)
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null) {
                        // Check role — only TEACHER can use this app
                        if (body.role != "TEACHER") {
                            _loginResult.value = Resource.Error(
                                "This app is for teachers only.\nUse the desktop system for librarian access."
                            )
                        } else {
                            _loginResult.value = Resource.Success(body)
                        }
                    } else {
                        _loginResult.value = Resource.Error(
                            "Empty response from server"
                        )
                    }
                } else {
                    // 401 = wrong credentials
                    val errorMsg = when (response.code()) {
                        401 -> "Invalid username or password"
                        403 -> "Account is deactivated. Contact the librarian."
                        else -> "Login failed. Try again."
                    }
                    _loginResult.value = Resource.Error(errorMsg)
                }

            } catch (e: Exception) {
                // Network error — server unreachable
                _loginResult.value = Resource.Error(
                    "Cannot connect to server.\nCheck your WiFi connection."
                )
            }
        }
    }
}