package com.arnold.mobileLib.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.arnold.mobileLib.MobileLibApp
import com.arnold.mobileLib.databinding.ActivityLoginBinding
import com.arnold.mobileLib.ui.main.MainActivity
import com.arnold.mobileLib.util.Resource

class LoginActivity : AppCompatActivity() {

    // ViewBinding — gives direct access to layout views
    // No more findViewById()
    private lateinit var binding: ActivityLoginBinding

    // ViewModel survives screen rotation
    private val viewModel: LoginViewModel by viewModels()

    private lateinit var app: MobileLibApp

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Inflate the layout using ViewBinding
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        app = application as MobileLibApp

        // If already logged in — go straight to MainActivity
        if (app.sessionManager.isLoggedIn()) {
            goToMain()
            return
        }

        setupClickListeners()
        observeViewModel()
    }

    private fun setupClickListeners() {
        binding.btnLogin.setOnClickListener {
            val username = binding.etUsername.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            viewModel.login(username, password)
        }
    }

    private fun observeViewModel() {
        // Observe loginResult — reacts to every state change
        viewModel.loginResult.observe(this) { result ->
            when (result) {
                is Resource.Loading -> {
                    // Show loading, hide button
                    binding.progressBar.visibility = View.VISIBLE
                    binding.btnLogin.isEnabled = false
                    binding.tvError.visibility = View.GONE
                }

                is Resource.Success -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnLogin.isEnabled = true

                    // Save session
                    val data = result.data
                    app.sessionManager.saveSession(
                        token = data.token,
                        userId = data.userId,
                        fullName = data.fullName,
                        role = data.role,
                        userName = data.userName,
                        streamId = data.streamId,
                        streamName = data.streamName
                    )

                    // Go to main app
                    goToMain()
                }

                is Resource.Error -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnLogin.isEnabled = true

                    // Show error message
                    binding.tvError.text = result.message
                    binding.tvError.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun goToMain() {
        startActivity(
            Intent(this, MainActivity::class.java)
        )
        // Finish LoginActivity so back button does not
        // bring user back to login screen
        finish()
    }
}