package com.arnold.mobileLib.ui.scan

import android.Manifest
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.pm.PackageManager
import android.graphics.drawable.GradientDrawable
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

    // The ISBN last scanned (return mode) — used to reload the
    // return candidates table
    private var lastScannedIsbn: String = ""

    // Return candidates adapter (ISBN scan in return mode)
    private lateinit var returnCandidatesAdapter: ReturnCandidatesAdapter

    // Camera
    private lateinit var cameraExecutor: ExecutorService
    private var isScanning = true  // paused after a successful scan
    private val barcodeScanner by lazy { BarcodeScanning.getClient() }

    // Purely decorative pulse on the scan guide frame — visual only
    private var scanGuidePulse: ObjectAnimator? = null

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
        setupReturnCandidates()
        setupClickListeners()
        observeViewModel()
        requestCameraPermission()
        startScanGuidePulse()
    }

    // Gentle alpha pulse on the scan window border so it reads as "live"
    // — purely decorative, no effect on scanning behaviour.
    private fun startScanGuidePulse() {
        scanGuidePulse = ObjectAnimator.ofFloat(
            binding.scanGuideFrame, View.ALPHA, 1f, 0.35f
        ).apply {
            duration = 900
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            start()
        }
    }

    private fun setupReturnCandidates() {
        returnCandidatesAdapter = ReturnCandidatesAdapter { record ->
            val qrCode = record.bookCopy?.qrCode ?: return@ReturnCandidatesAdapter
            viewModel.returnBook(qrCode)
        }
        binding.recyclerReturnCandidates.layoutManager =
            LinearLayoutManager(requireContext())
        binding.recyclerReturnCandidates.adapter = returnCandidatesAdapter

        viewModel.returnCandidates.observe(viewLifecycleOwner) { result ->
            when (result) {
                null -> {
                    binding.layoutReturnCandidates.visibility = View.GONE
                }
                is Resource.Loading -> {
                    binding.layoutReturnCandidates.visibility = View.VISIBLE
                    binding.tvNoCandidates.visibility = View.GONE
                }
                is Resource.Success -> {
                    binding.layoutReturnCandidates.visibility = View.VISIBLE
                    returnCandidatesAdapter.submitList(result.data)
                    binding.tvNoCandidates.visibility =
                        if (result.data.isEmpty()) View.VISIBLE else View.GONE
                }
                is Resource.Error -> {
                    binding.layoutReturnCandidates.visibility = View.VISIBLE
                    binding.tvNoCandidates.visibility = View.VISIBLE
                    binding.tvNoCandidates.text = result.message
                    returnCandidatesAdapter.submitList(emptyList())
                }
            }
        }
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
        val context = requireContext()
        val primary = ContextCompat.getColor(context, R.color.primary)
        val card = ContextCompat.getColor(context, R.color.card)
        val inverse = ContextCompat.getColor(context, R.color.text_inverse)

        if (isAssignMode) {
            // Active pill: filled navy, white text
            binding.btnModeAssign.backgroundTintList =
                android.content.res.ColorStateList.valueOf(primary)
            binding.btnModeAssign.setTextColor(inverse)
            // Inactive pill: white fill, navy outline + text
            binding.btnModeReturn.backgroundTintList =
                android.content.res.ColorStateList.valueOf(card)
            binding.btnModeReturn.setTextColor(primary)
            binding.tvScanHint.text =
                "ASSIGN MODE — Scan a book to assign"
        } else {
            binding.btnModeReturn.backgroundTintList =
                android.content.res.ColorStateList.valueOf(primary)
            binding.btnModeReturn.setTextColor(inverse)
            binding.btnModeAssign.backgroundTintList =
                android.content.res.ColorStateList.valueOf(card)
            binding.btnModeAssign.setTextColor(primary)
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

            viewModel.assignByAccession(
                accessionNumber = lastScannedCode,
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

        // Manual fallback — camera may be unavailable, or the
        // printed/written code may be damaged or hard to scan
        binding.btnManualLookup.setOnClickListener {
            submitManualCode()
        }
        binding.etManualCode.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_DONE) {
                submitManualCode()
                true
            } else {
                false
            }
        }
    }

    // ISBNs are 10 or 13 digits; everything else (e.g. ACC-3-0001)
    // is treated as an accession number — same rule the web app uses.
    private fun submitManualCode() {
        val value = binding.etManualCode.text.toString().trim()
        if (value.isEmpty()) return

        // The keyboard stays open after a plain button tap (unlike an
        // IME action), and would otherwise sit on top of the student
        // picker that appears below once the book is found — making
        // student rows untappable until the teacher dismisses it
        // themselves. Hide it now, right when we know the field is done.
        hideKeyboard()

        isScanning = false
        val digitsOnly = value.replace("-", "")
        val isIsbn = digitsOnly.matches(Regex("\\d{10}|\\d{13}"))

        binding.etManualCode.setText("")

        if (isIsbn && !isAssignMode) {
            lastScannedIsbn = digitsOnly
            binding.tvScanHint.text = "ISBN: $digitsOnly — loading..."
            viewModel.lookupByIsbn(digitsOnly)
        } else {
            lastScannedCode = value
            binding.tvScanHint.text = "Looking up: $value"
            viewModel.lookupByAccession(value)
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

        // ISBN lookup result (return mode) — teacher scanned the
        // barcode on the book's back cover
        viewModel.isbnLookup.observe(viewLifecycleOwner) { result ->
            when (result) {
                null -> { /* initial state */ }
                is Resource.Loading -> {
                    binding.tvScanHint.text = "Looking up ISBN..."
                }
                is Resource.Success -> {
                    showIsbnBookInfo(result.data)
                }
                is Resource.Error -> {
                    binding.tvScanHint.text = result.message
                    isScanning = true
                }
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
                    showResult(result.data, true)
                    // Prevent re-tapping Assign/Return to fire a duplicate
                    // request against the book that was just processed
                    binding.btnAssign.visibility = View.GONE
                    binding.btnReturn.visibility = View.GONE
                    lastScannedCode = ""
                    lastScannedIsbn = ""
                    selectedStudent = null
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
        // Make sure the keyboard isn't left open covering the student
        // picker / action buttons this reveals below.
        hideKeyboard()

        // Show the book info card
        binding.scrollBookInfo.visibility = View.VISIBLE
        binding.layoutReturnCandidates.visibility = View.GONE
        binding.tvBookTitle.text =
            book.bookDetails?.titleName ?: "Unknown Title"
        binding.tvBookSubject.text =
            book.bookDetails?.subject ?: ""
        binding.tvBookStatus.text = book.status

        // Color the status pill — recolor the existing GradientDrawable
        // in place so the rounded badge shape is preserved (setting a
        // plain background color would flatten it into a rectangle).
        when (book.status) {
            "AVAILABLE" -> setStatusPill(binding.tvBookStatus, R.color.success, R.color.success_light)
            "DISTRIBUTED" -> setStatusPill(binding.tvBookStatus, R.color.warning, R.color.warning_light)
            else -> setStatusPill(binding.tvBookStatus, R.color.danger, R.color.danger_light)
        }

        if (isAssignMode) {
            // Check book is available
            if (book.status != "AVAILABLE") {
                showResult(
                    "Book is ${book.status} — cannot assign",
                    false
                )
                isScanning = true
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
                isScanning = true
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

    // ISBN scan during return — shows the title and loads the table
    // of students in the teacher's stream currently holding a copy
    private fun showIsbnBookInfo(details: com.arnold.mobileLib.data.model.BookDetails) {
        binding.scrollBookInfo.visibility = View.VISIBLE
        binding.tvBookTitle.text = details.titleName
        binding.tvBookSubject.text = details.subject
        binding.tvBookStatus.text = "SCAN RESULT"
        setStatusPill(binding.tvBookStatus, R.color.info, R.color.info_light)

        binding.layoutHolder.visibility = View.GONE
        binding.layoutStudentPicker.visibility = View.GONE
        binding.btnAssign.visibility = View.GONE
        binding.btnReturn.visibility = View.GONE

        val app = requireActivity().application as MobileLibApp
        val streamId = app.sessionManager.getStreamId() ?: return
        viewModel.loadReturnCandidatesByIsbn(lastScannedIsbn, streamId)
    }

    private fun showResult(message: String, success: Boolean) {
        binding.tvScanResult.text = message
        binding.tvScanResult.visibility = View.VISIBLE
        if (success) {
            setStatusPill(binding.tvScanResult, R.color.success, R.color.success_light)
        } else {
            setStatusPill(binding.tvScanResult, R.color.danger, R.color.danger_light)
        }
    }

    // Recolors a pill/badge-shaped TextView's background in place —
    // used instead of setBackgroundColor everywhere the view's XML
    // background is a rounded GradientDrawable, so the shape survives
    // dynamic recoloring instead of being replaced by a flat rectangle.
    private fun setStatusPill(view: android.widget.TextView, textColorRes: Int, bgColorRes: Int) {
        val context = view.context
        view.setTextColor(ContextCompat.getColor(context, textColorRes))
        (view.background.mutate() as? GradientDrawable)?.setColor(
            ContextCompat.getColor(context, bgColorRes)
        )
    }

    // Hides the soft keyboard and drops focus from whichever EditText
    // triggered it, so it can't linger on top of content that appears
    // below (the student picker, action buttons, etc).
    private fun hideKeyboard() {
        val imm = requireContext().getSystemService(
            android.content.Context.INPUT_METHOD_SERVICE
        ) as android.view.inputmethod.InputMethodManager
        imm.hideSoftInputFromWindow(binding.root.windowToken, 0)
        binding.root.requestFocus()
    }

    private fun resetScan() {
        lastScannedCode = ""
        lastScannedIsbn = ""
        selectedStudent = null
        isScanning = true
        binding.scrollBookInfo.visibility = View.GONE
        binding.layoutHolder.visibility = View.GONE
        binding.layoutStudentPicker.visibility = View.GONE
        binding.layoutReturnCandidates.visibility = View.GONE
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
        barcodeScanner.process(image)
            .addOnSuccessListener { barcodes ->
                val found = barcodes.firstOrNull { barcode ->
                    val value = barcode.rawValue
                    if (value.isNullOrBlank()) return@firstOrNull false

                    // Accept EAN-13 (ISBN printed on book back covers)
                    val isIsbn = barcode.format == Barcode.FORMAT_EAN_13
                    // Accept our accession number format ACC-X-XXXX
                    val isAccession = value.startsWith("ACC-")

                    isIsbn || isAccession
                }

                if (found != null) {
                    // Barcode found — pause scanning
                    isScanning = false
                    val value = found.rawValue!!
                    val isIsbn = found.format == Barcode.FORMAT_EAN_13

                    requireActivity().runOnUiThread {
                        // Fragment view may have been destroyed while this
                        // callback was in flight (navigated away mid-scan)
                        if (_binding == null) return@runOnUiThread

                        if (isIsbn && !isAssignMode) {
                            // ISBN scan in return mode
                            lastScannedIsbn = value
                            binding.tvScanHint.text = "ISBN: $value — loading..."
                            viewModel.lookupByIsbn(value)
                        } else {
                            // Accession number — direct copy lookup
                            lastScannedCode = value
                            binding.tvScanHint.text = "Looking up: $value"
                            viewModel.lookupByAccession(value)
                        }
                    }
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        scanGuidePulse?.cancel()
        scanGuidePulse = null
        cameraExecutor.shutdown()
        barcodeScanner.close()
        _binding = null
    }
}