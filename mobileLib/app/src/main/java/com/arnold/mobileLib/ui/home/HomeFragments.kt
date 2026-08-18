package com.arnold.mobileLib.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.arnold.mobileLib.R
import com.arnold.mobileLib.MobileLibApp
import com.arnold.mobileLib.databinding.FragmentHomeBinding
import com.arnold.mobileLib.ui.login.LoginActivity
import com.arnold.mobileLib.util.Resource

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val viewModel: HomeViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val app = requireActivity().application as MobileLibApp
        val session = app.sessionManager

        // Populate welcome card
        binding.tvWelcome.text = "Welcome, ${session.getFullName()} 👋"
        binding.tvStreamName.text =
            "Stream: ${session.getStreamName() ?: "Not assigned"}"

        if (session.getStreamId() == null) {
            binding.tvStudentCount.text = "—"
            binding.tvBooksOut.text = "—"
        }

        observeViewModel()
        setupClickListeners()
    }

    override fun onResume() {
        super.onResume()
        // Reload every time Home becomes visible again — not just on
        // first creation — so the stats reflect books assigned/returned
        // on the Scan tab without requiring a manual refresh.
        val app = requireActivity().application as MobileLibApp
        app.sessionManager.getStreamId()?.let { streamId ->
            viewModel.loadStats(streamId)
        }
    }

    private fun observeViewModel() {
        viewModel.studentCount.observe(viewLifecycleOwner) { result ->
            when (result) {
                is Resource.Loading -> {
                    binding.tvStudentCount.text = "..."
                }
                is Resource.Success -> {
                    binding.tvStudentCount.text =
                        result.data.toString()
                }
                is Resource.Error -> {
                    binding.tvStudentCount.text = "—"
                }
            }
        }

        viewModel.booksOut.observe(viewLifecycleOwner) { result ->
            when (result) {
                is Resource.Loading -> {
                    binding.tvBooksOut.text = "..."
                }
                is Resource.Success -> {
                    binding.tvBooksOut.text = result.data.toString()
                }
                is Resource.Error -> {
                    binding.tvBooksOut.text = "—"
                }
            }
        }
    }

    private fun setupClickListeners() {
        binding.btnGoScan.setOnClickListener {
            findNavController().navigate(R.id.scanFragment)
        }

        binding.btnGoStudents.setOnClickListener {
            findNavController().navigate(R.id.studentsFragment)
        }

        binding.btnLogout.setOnClickListener {
            // Confirm before logging out — same logout logic as before,
            // just gated behind a confirmation dialog so it isn't
            // triggered by an accidental tap.
            AlertDialog.Builder(requireContext())
                .setTitle("Log out?")
                .setMessage("You'll need to sign in again to continue.")
                .setPositiveButton("Logout") { _, _ ->
                    val app = requireActivity().application as MobileLibApp
                    app.sessionManager.clearSession()
                    startActivity(
                        Intent(requireContext(), LoginActivity::class.java)
                    )
                    requireActivity().finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        // Avoid memory leaks — clear binding when fragment destroyed
        _binding = null
    }
}