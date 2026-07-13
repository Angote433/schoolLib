package com.arnold.mobileLib.ui.distributions

import android.os.Bundle
import android.view.*
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.arnold.mobileLib.MobileLibApp
import com.arnold.mobileLib.data.model.DistributionRecord
import com.arnold.mobileLib.databinding.FragmentDistributionsBinding
import com.arnold.mobileLib.util.Resource
import com.google.android.material.snackbar.Snackbar

class DistributionsFragment : Fragment() {

    private var _binding: FragmentDistributionsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: DistributionsViewModel by viewModels()
    private lateinit var adapter: DistributionsAdapter
    private var streamId: Int = -1
    private var teacherId: Int = -1

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDistributionsBinding.inflate(
            inflater, container, false
        )
        return binding.root
    }

    override fun onViewCreated(
        view: View, savedInstanceState: Bundle?
    ) {
        super.onViewCreated(view, savedInstanceState)

        val app = requireActivity().application as MobileLibApp
        val session = app.sessionManager

        streamId = session.getStreamId() ?: -1
        teacherId = session.getUserId()

        binding.tvDistStreamLabel.text =
            "Stream ${session.getStreamName() ?: "—"} — " +
                    "Academic Year ${java.util.Calendar.getInstance()
                        .get(java.util.Calendar.YEAR)}"

        setupRecyclerView()
        observeViewModel()
        setupClickListeners()

        if (streamId != -1) {
            viewModel.loadDistributions(streamId)
        }
    }

    private fun setupRecyclerView() {
        adapter = DistributionsAdapter { record ->
            showFlagLostDialog(record)
        }
        binding.recyclerDistributions.layoutManager =
            LinearLayoutManager(requireContext())
        binding.recyclerDistributions.adapter = adapter
    }

    private fun showFlagLostDialog(record: DistributionRecord) {
        val bookTitle = record.bookCopy?.bookDetails?.titleName
            ?: "this book"
        val studentName = record.student?.fullName ?: "the student"

        // Ask for a reason
        val input = android.widget.EditText(requireContext()).apply {
            hint = "Reason for loss..."
            setPadding(40, 20, 40, 20)
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Flag as Lost")
            .setMessage(
                "Flag \"$bookTitle\" as lost for $studentName?\n\n" +
                        "A loss report will be created for the librarian."
            )
            .setView(input)
            .setPositiveButton("Flag as Lost") { _, _ ->
                val reason = input.text.toString().trim()
                    .ifBlank { "Book not returned — reported by teacher" }
                viewModel.flagAsLost(
                    qrCode = record.bookCopy?.qrCode ?: return@setPositiveButton,
                    reason = reason,
                    teacherId = teacherId,
                    streamId = streamId
                )
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setupClickListeners() {
        binding.btnRefresh.setOnClickListener {
            if (streamId != -1) viewModel.loadDistributions(streamId)
        }
    }

    private fun observeViewModel() {
        viewModel.distributions.observe(viewLifecycleOwner) { result ->
            when (result) {
                is Resource.Loading -> {
                    binding.progressBarDist.visibility = View.VISIBLE
                    binding.recyclerDistributions.visibility = View.GONE
                    binding.emptyStateDist.visibility = View.GONE
                }
                is Resource.Success -> {
                    binding.progressBarDist.visibility = View.GONE
                    val list = result.data
                    if (list.isEmpty()) {
                        binding.recyclerDistributions.visibility =
                            View.GONE
                        binding.emptyStateDist.visibility = View.VISIBLE
                        binding.tvDistCount.text = "No books currently out"
                    } else {
                        binding.recyclerDistributions.visibility =
                            View.VISIBLE
                        binding.emptyStateDist.visibility = View.GONE
                        binding.tvDistCount.text =
                            "${list.size} book" +
                                    if (list.size == 1) "" else "s" +
                                            " currently distributed"
                        adapter.submitList(list)
                    }
                }
                is Resource.Error -> {
                    binding.progressBarDist.visibility = View.GONE
                    binding.tvDistCount.text = result.message
                }
            }
        }

        viewModel.flagResult.observe(viewLifecycleOwner) { result ->
            when (result) {
                is Resource.Success -> {
                    Snackbar.make(
                        binding.root, result.data, 3000
                    ).show()
                }
                is Resource.Error -> {
                    Snackbar.make(
                        binding.root,
                        "Failed: ${result.message}",
                        3000
                    ).show()
                }
                else -> {}
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}