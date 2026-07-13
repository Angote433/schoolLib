package com.arnold.mobileLib.ui.scan

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.arnold.mobileLib.R
import com.arnold.mobileLib.MobileLibApp
import com.arnold.mobileLib.data.model.Student
import com.arnold.mobileLib.databinding.FragmentScanBinding
import com.arnold.mobileLib.util.Resource
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ScanFragment : Fragment() {

    private var _binding: FragmentScanBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ScanViewModel by viewModels()

    // ASSIGN or RETURN
    private var isAssignMode = true

    // Currently selected student for assign mode
    private var selectedStudent: Student? = null

    // The barcode value last scanned — stored so we can use
    // it when the assign/return button is tapped
    private var lastScannedCode: String = ""

    // Camera
    private lateinit var cameraExecutor: ExecutorService
    private var isScanning = true  // paused after a successful scan

    // Student picker adapter (reuse StudentsAdapter)
    private lateinit var studentPickerAdapter:
            com.arnold.mobileLib.ui.students.StudentsAdapter

    // Camera permission launcher
    private val permissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { granted ->
            if (granted) startCamera()
            else binding.tvScanHint.text =
                "Camera permission required for scanning"
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentScanBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        cameraExecutor = Executors.newSingleThreadExecutor()

        val app = requireActivity().application as MobileLibApp
        val session = app.sessionManager

        // Load teacher's students for the picker
        session.getStreamId()?.let { streamId ->
            viewModel.loadStudents(streamId)
        }

        setupModeButtons()
        setupStudentPicker()
        setupClickListeners()
        observeViewModel()
        requestCameraPermission()
    }

    private fun setupModeButtons() {
        updateModeUI()

        binding.btnModeAssign.setOnClickListener {
            isAssignMode = true
            updateModeUI()
            resetScan()
        }

        binding.btnModeReturn.setOnClickListener {
            isAssignMode = false
            updateModeUI()
            resetScan()
        }
    }

    private fun updateModeUI() {
        if (isAssignMode) {
            binding.btnModeAssign.backgroundTintList =
                ContextCompat.getColorStateList(
                    requireContext(), android.R.color.white
                )
            binding.btnModeAssign.setTextColor(
                ContextCompat.getColor(requireContext(),
                    android.R.color.black)
            )
            binding.btnModeReturn.backgroundTintList =
                android.content.res.ColorStateList.valueOf(
                    android.graphics.Color.parseColor("#33FFFFFF")
                )
            binding.btnModeReturn.setTextColor(
                android.graphics.Color.WHITE
            )
            binding.tvScanHint.text =
                "ASSIGN MODE — Scan a book to assign"
        } else {
            binding.btnModeReturn.backgroundTintList =
                ContextCompat.getColorStateList(
                    requireContext(), android.R.color.white
                )
            binding.btnModeReturn.setTextColor(
                ContextCompat.getColor(requireContext(),
                    android.R.color.black)
            )
            binding.btnModeAssign.backgroundTintList =
                android.content.res.ColorStateList.valueOf(
                    android.graphics.Color.parseColor("#33FFFFFF")
                )
            binding.btnModeAssign.setTextColor(
                android.graphics.Color.WHITE
            )
            binding.tvScanHint.text =
                "RETURN MODE — Scan a book to return"
        }
    }

    private fun setupStudentPicker() {
        studentPickerAdapter =
            com.arnold.mobileLib.ui.students.StudentsAdapter()
        binding.recyclerStudentPicker.layoutManager =
            LinearLayoutManager(requireContext())
        binding.recyclerStudentPicker.adapter = studentPickerAdapter

        // When teacher taps a student in the picker
        studentPickerAdapter.setOnItemClickListener { student ->
            selectedStudent = student
            binding.btnAssign.text =
                "Assign to ${student.fullName}"
            binding.btnAssign.alpha = 1f
        }

        // Search within the picker
        binding.etStudentSearch.addTextChangedListener(
            object : TextWatcher {
                override fun beforeTextChanged(
                    s: CharSequence?, start: Int, count: Int, after: Int
                ) {}
                override fun onTextChanged(
                    s: CharSequence?, start: Int, before: Int, count: Int
                ) {
                    viewModel.searchStudents(s.toString())
                }
                override fun afterTextChanged(s: Editable?) {}
            })
    }

    private fun setupClickListeners() {
        binding.btnAssign.setOnClickListener {
            val student = selectedStudent ?: run {
                showResult("Please select a student first", false)
                return@setOnClickListener
            }

            val app = requireActivity().application as MobileLibApp
            val teacherId = app.sessionManager.getUserId()

            viewModel.assignBook(
                qrCode = lastScannedCode,
                studentId = student.studentId,
                teacherId = teacherId
            )
        }

        binding.btnReturn.setOnClickListener {
            viewModel.returnBook(lastScannedCode)
        }

        binding.btnScanAgain.setOnClickListener {
            resetScan()
        }
    }

    private fun observeViewModel() {
        // Students list for picker
        viewModel.students.observe(viewLifecycleOwner) { students ->
            studentPickerAdapter.submitList(students)
        }

        // Book lookup result
        viewModel.scannedBook.observe(viewLifecycleOwner) { result ->
            when (result) {
                null -> { /* initial state */ }
                is Resource.Loading -> {
                    binding.tvScanHint.text = "Looking up book..."
                }
                is Resource.Success -> {
                    val book = result.data
                    showBookInfo(book)
                }
                is Resource.Error -> {
                    binding.tvScanHint.text = result.message
                    // Resume scanning after error
                    isScanning = true
                }
            }
        }

        // Active distribution (for return mode)
        viewModel.activeDistribution.observe(viewLifecycleOwner) { dist ->
            if (dist != null && !isAssignMode) {
                binding.layoutHolder.visibility = View.VISIBLE
                binding.tvHolderName.text = dist.student?.fullName
                    ?: "Unknown"
            }
        }

        // Assign/return result
        viewModel.actionResult.observe(viewLifecycleOwner) { result ->
            when (result) {
                null -> {}
                is Resource.Loading -> {
                    binding.btnAssign.isEnabled = false
                    binding.btnReturn.isEnabled = false
                }
                is Resource.Success -> {
                    binding.btnAssign.isEnabled = true
                    binding.btnReturn.isEnabled = true
                    showResult(result.data, true)
                }
                is Resource.Error -> {
                    binding.btnAssign.isEnabled = true
                    binding.btnReturn.isEnabled = true
                    showResult(result.message, false)
                }
            }
        }
    }

    private fun showBookInfo(book: com.arnold.mobileLib.data.model.BookCopy) {
        // Show the book info card
        binding.scrollBookInfo.visibility = View.VISIBLE
        binding.tvBookTitle.text =
            book.bookDetails?.titleName ?: "Unknown Title"
        binding.tvBookSubject.text =
            book.bookDetails?.subject ?: ""
        binding.tvBookStatus.text = book.status

        // Color the status badge
        when (book.status) {
            "AVAILABLE" -> {
                binding.tvBookStatus.setTextColor(
                    android.graphics.Color.parseColor("#276749")
                )
                binding.tvBookStatus.setBackgroundColor(
                    android.graphics.Color.parseColor("#F0FFF4")
                )
            }
            "DISTRIBUTED" -> {
                binding.tvBookStatus.setTextColor(
                    android.graphics.Color.parseColor("#744210")
                )
                binding.tvBookStatus.setBackgroundColor(
                    android.graphics.Color.parseColor("#FFFFF0")
                )
            }
            else -> {
                binding.tvBookStatus.setTextColor(
                    android.graphics.Color.parseColor("#C53030")
                )
                binding.tvBookStatus.setBackgroundColor(
                    android.graphics.Color.parseColor("#FFF5F5")
                )
            }
        }

        if (isAssignMode) {
            // Check book is available
            if (book.status != "AVAILABLE") {
                showResult(
                    "Book is ${book.status} — cannot assign",
                    false
                )
                return
            }
            // Show student picker
            binding.layoutStudentPicker.visibility = View.VISIBLE
            binding.btnAssign.visibility = View.VISIBLE
            binding.btnAssign.text = "Select a student ↑"
            binding.btnAssign.alpha = 0.5f
            binding.layoutHolder.visibility = View.GONE

        } else {
            // Return mode
            if (book.status != "DISTRIBUTED") {
                showResult(
                    "Book is ${book.status} — not currently distributed",
                    false
                )
                return
            }
            binding.layoutStudentPicker.visibility = View.GONE
            binding.btnReturn.visibility = View.VISIBLE
            binding.btnAssign.visibility = View.GONE

            // Load who currently has this book
            val app = requireActivity().application as MobileLibApp
            val streamId = app.sessionManager.getStreamId() ?: return
            viewModel.loadActiveDistribution(streamId, book.qrCode)
        }
    }

    private fun showResult(message: String, success: Boolean) {
        binding.tvScanResult.text = message
        binding.tvScanResult.visibility = View.VISIBLE
        binding.tvScanResult.setTextColor(
            if (success) android.graphics.Color.parseColor("#276749")
            else android.graphics.Color.parseColor("#C53030")
        )
        binding.tvScanResult.setBackgroundColor(
            if (success) android.graphics.Color.parseColor("#F0FFF4")
            else android.graphics.Color.parseColor("#FFF5F5")
        )
    }

    private fun resetScan() {
        lastScannedCode = ""
        selectedStudent = null
        isScanning = true
        binding.scrollBookInfo.visibility = View.GONE
        binding.layoutHolder.visibility = View.GONE
        binding.layoutStudentPicker.visibility = View.GONE
        binding.btnAssign.visibility = View.GONE
        binding.btnReturn.visibility = View.GONE
        binding.tvScanResult.visibility = View.GONE
        binding.etStudentSearch.setText("")
        viewModel.clearState()
        updateModeUI()
    }

    // ── CAMERA ────────────────────────────────────────────

    private fun requestCameraPermission() {
        if (ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        val cameraProviderFuture =
            ProcessCameraProvider.getInstance(requireContext())

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            // Preview
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.cameraPreview.surfaceProvider)
            }

            // Image analysis — this is where ML Kit reads barcodes
            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(
                    ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST
                )
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImage(imageProxy)
                    }
                }

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    viewLifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageAnalyzer
                )
            } catch (e: Exception) {
                binding.tvScanHint.text =
                    "Failed to start camera: ${e.message}"
            }

        }, ContextCompat.getMainExecutor(requireContext()))
    }

    @androidx.annotation.OptIn(
        androidx.camera.core.ExperimentalGetImage::class
    )
    private fun processImage(imageProxy: ImageProxy) {
        // Skip if not scanning (already found a barcode)
        if (!isScanning) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image ?: run {
            imageProxy.close()
            return
        }

        val image = InputImage.fromMediaImage(
            mediaImage, imageProxy.imageInfo.rotationDegrees
        )

        // ML Kit barcode scanner
        val scanner = BarcodeScanning.getClient()
        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val value = barcode.rawValue
                    if (!value.isNullOrBlank() &&
                        barcode.format == Barcode.FORMAT_CODE_128
                    ) {
                        // Barcode found — pause scanning
                        isScanning = false
                        lastScannedCode = value

                        // Look up the book on the main thread
                        requireActivity().runOnUiThread {
                            viewModel.lookupBook(value)
                        }
                        break
                    }
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        cameraExecutor.shutdown()
        _binding = null
    }
}