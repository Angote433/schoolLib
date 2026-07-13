package com.arnold.mobileLib.ui.students

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.arnold.mobileLib.R
import com.arnold.mobileLib.MobileLibApp
import com.arnold.mobileLib.databinding.DialogAddStudentBinding
import com.arnold.mobileLib.databinding.FragmentStudentsBinding
import com.arnold.mobileLib.util.Resource
import java.util.Calendar

class StudentsFragment : Fragment() {

    private var _binding: FragmentStudentsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: StudentsViewModel by viewModels()
    private lateinit var adapter: StudentsAdapter
    private var streamId: Int = -1

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentStudentsBinding.inflate(
            inflater, container, false
        )
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val app = requireActivity().application as MobileLibApp
        val session = app.sessionManager

        streamId = session.getStreamId() ?: -1
        val streamName = session.getStreamName() ?: "Unknown"

        binding.tvStreamLabel.text = "Stream $streamName"

        setupRecyclerView()
        setupSearch()
        setupClickListeners()
        observeViewModel()

        if (streamId != -1) {
            viewModel.loadStudents(streamId)
        } else {
            binding.tvCount.text = "No stream assigned"
        }
    }

    private fun setupRecyclerView() {
        adapter = StudentsAdapter()
        binding.recyclerStudents.layoutManager =
            LinearLayoutManager(requireContext())
        binding.recyclerStudents.adapter = adapter
    }

    private fun setupSearch() {
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(
                s: CharSequence?, start: Int, count: Int, after: Int
            ) {}
            override fun onTextChanged(
                s: CharSequence?, start: Int, before: Int, count: Int
            ) {
                viewModel.search(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupClickListeners() {
        binding.btnAddStudent.setOnClickListener {
            showAddStudentDialog()
        }
    }

    private fun showAddStudentDialog() {
        val dialogBinding = DialogAddStudentBinding.inflate(layoutInflater)

        // Pre-fill year with current year
        dialogBinding.etYear.setText(
            Calendar.getInstance().get(Calendar.YEAR).toString()
        )

        val dialog = AlertDialog.Builder(requireContext())
            .setTitle("Add Student to Stream")
            .setView(dialogBinding.root)
            .setPositiveButton("Add") { _, _ ->
                // Handled below — we override to prevent auto-dismiss
            }
            .setNegativeButton("Cancel", null)
            .create()

        dialog.show()

        // Override positive button to validate before dismissing
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val admNo = dialogBinding.etAdmission.text.toString().trim()
            val name = dialogBinding.etFullName.text.toString().trim()
            val year = dialogBinding.etYear.text.toString().trim()
                .toIntOrNull() ?: Calendar.getInstance()
                .get(Calendar.YEAR)

            if (admNo.isBlank()) {
                dialogBinding.tvDialogError.text =
                    "Admission number is required"
                dialogBinding.tvDialogError.visibility = View.VISIBLE
                return@setOnClickListener
            }

            if (name.isBlank()) {
                dialogBinding.tvDialogError.text =
                    "Full name is required"
                dialogBinding.tvDialogError.visibility = View.VISIBLE
                return@setOnClickListener
            }

            // Hide error and submit
            dialogBinding.tvDialogError.visibility = View.GONE
            viewModel.addStudent(streamId, admNo, name, year)
            dialog.dismiss()
        }
    }

    private fun observeViewModel() {
        viewModel.students.observe(viewLifecycleOwner) { result ->
            when (result) {
                is Resource.Loading -> {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.recyclerStudents.visibility = View.GONE
                    binding.emptyState.visibility = View.GONE
                }

                is Resource.Success -> {
                    binding.progressBar.visibility = View.GONE
                    val list = result.data
                    if (list.isEmpty()) {
                        binding.recyclerStudents.visibility = View.GONE
                        binding.emptyState.visibility = View.VISIBLE
                        binding.tvCount.text = "No students"
                    } else {
                        binding.recyclerStudents.visibility = View.VISIBLE
                        binding.emptyState.visibility = View.GONE
                        val activeCount = list.count { it.isActive }
                        binding.tvCount.text =
                            "$activeCount active student" +
                                    if (activeCount == 1) "" else "s"
                        adapter.submitList(list)
                    }
                }

                is Resource.Error -> {
                    binding.progressBar.visibility = View.GONE
                    binding.tvCount.text = result.message
                }
            }
        }

        viewModel.addResult.observe(viewLifecycleOwner) { result ->
            when (result) {
                is Resource.Loading -> {
                    // Dialog handles its own loading state
                }
                is Resource.Success -> {
                    showSnackbar("Student added successfully ✅")
                }
                is Resource.Error -> {
                    showSnackbar("Failed: ${result.message}")
                }
            }
        }
    }

    private fun showSnackbar(message: String) {
        com.google.android.material.snackbar.Snackbar
            .make(binding.root, message, 3000).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}