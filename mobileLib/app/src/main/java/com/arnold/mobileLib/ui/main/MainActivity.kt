package com.arnold.mobileLib.ui.main

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.arnold.mobileLib.MobileLibApp
import com.arnold.mobileLib.R
import com.arnold.mobileLib.databinding.ActivityMainBinding
import com.arnold.mobileLib.ui.login.LoginActivity

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val app = application as MobileLibApp

        // If not logged in — go back to login
        if (!app.sessionManager.isLoggedIn()) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        // Connect bottom navigation to navigation controller
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.navHostFragment)
                as NavHostFragment
        val navController = navHostFragment.navController
        binding.bottomNav.setupWithNavController(navController)
    }
}