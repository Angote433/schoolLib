# CLAUDE.md — School Library Management System

This file gives Claude Code full context about this project.
Read this entire file before making any changes.

---

## Project Overview

A full-stack school library management system for Kenyan secondary schools.
Three platforms: Spring Boot REST API, React web app (librarian), Android app (teacher).

The system manages:
- Book registration and copy tracking
- Book distribution to students (class allocation)
- Library borrowing (short-term loans)
- Loss reporting and resolution

---

## Repository Structure

```
school-library-system/
  autolibrary/          Spring Boot backend (Java 25, Maven)
  library-frontend/     React 18 frontend (librarian desktop)
  mobileLib/            Android app (Kotlin, teacher mobile)
```

---

## Tech Stack

### Backend
- Java 25, Spring Boot 3.5.x, Maven
- Spring Security 6 + JWT (jjwt 0.11.5)
- Hibernate 6 / JPA, MySQL 8
- ZXing 3.5.2 (barcode generation)
- Package root: `com.arnold.autolibrary`

### Frontend
- React 18, React Router v6, Axios
- No CSS frameworks — inline styles throughout
- All API calls go through `src/services/libraryApi.js`
- Auth state managed via `src/context/AuthContext.jsx`

### Mobile
- Kotlin, Android (min SDK 26)
- CameraX + ML Kit barcode scanning
- Retrofit2 + Gson, MVVM architecture
- Package root: `com.arnold.mobileLib`

---

## Database

Database name: `school_library`

### Tables (all use snake_case columns)

```sql
school_class     classId, className, gradeLevel, academicYear
stream           streamId, streamName, classId(FK), teacherId(FK), capacity, isActive
user_details     userId, fullName, userName, passwordHash, role(ENUM), streamId(FK), isActive
student          studentId, admissionNumber, fullName, streamId(FK), yearEnrolled, isActive
book_details     detailsId, titleName, subject, gradeLevel, publisher, copies, isbn, createdAt
book_copy        bookId, detailsId(FK), qrCode(UNIQUE), status(ENUM), isActive, dateAcquired
distribution_record  distributionId, bookId(FK), studentId(FK), dateDistributed, dateReturned, academicYear, distributedBy(FK), status
borrow_record    borrowId, bookId(FK), studentId(FK), dateBorrowed, dateDue, dateReturned, issuedBy(FK), status
loss_report      reportId, copyId(FK), studentId(FK), dateFlagged, source(ENUM), reason, resolutionStatus(ENUM), dateResolved, notes
```

### Enums
- `Role`: LIBRARIAN, TEACHER
- `BookStatus`: AVAILABLE, BORROWED, DISTRIBUTED, LOST
- `DistributionStatus`: DISTRIBUTED, RETURNED, LOST
- `BorrowStatus`: ACTIVE, RETURNED, OVERDUE, LOST
- `LossSource`: DISTRIBUTION, BORROWING
- `ResolutionStatus`: PENDING, RESOLVED, WRITTEN_OFF

---

## Backend File Locations

```
src/main/java/com/arnold/autolibrary/
  AutolibraryApplication.java
  config/
    SecurityConfig.java
  controller/
    AuthController.java
    BookController.java
    BorrowController.java
    DistributionController.java
    LossReportController.java
    SchoolClassController.java
    StreamController.java
    StudentController.java
    UserDetailsController.java
  model/
    BookCopy.java
    BookDetails.java
    BorrowRecord.java
    DistributionRecord.java
    LossReport.java
    SchoolClass.java
    Stream.java
    Student.java
    UserDetails.java
    enums/
      BookStatus.java
      BorrowStatus.java
      DistributionStatus.java
      LossSource.java
      ResolutionStatus.java
      Role.java
  repository/
    BookCopyRepository.java
    BookDetailsRepository.java
    BorrowRecordRepository.java
    DistributionRecordRepository.java
    LossReportRepository.java
    SchoolClassRepository.java
    StreamRepository.java
    StudentRepository.java
    UserDetailsRepository.java
  security/
    CustomUserDetailsService.java
    JwtAuthFilter.java
  service/
    BookService.java
    BorrowService.java
    DistributionService.java
    LossReportService.java
    SchoolClassService.java
    StreamService.java
    StudentService.java
    UserDetailsService.java
  util/
    BarcodeGenerator.java
    JwtUtil.java
src/main/resources/
  application.properties
  library_system_v2.sql
```

---

## Frontend File Locations

```
library-frontend/src/
  App.jsx                    Routes + ProtectedRoute
  index.js                   Entry point
  context/
    AuthContext.jsx           login(), logout(), user state
  services/
    api.js                   Axios instance + interceptors
    libraryApi.js            All API service functions
  components/
    Layout.jsx               Sidebar + navigation shell
  pages/
    Login.jsx
    Dashboard.jsx
    Classes.jsx
    Users.jsx
    Students.jsx
    Books.jsx
    Distributions.jsx
    Borrows.jsx
    Losses.jsx
```

---

## Mobile File Locations

```
mobileLib/app/src/main/java/com/arnold/mobileLib/
  SchoolLibraryApp.kt
  data/
    model/
      AddStudentRequest.kt
      BookCopy.kt
      BookDetails.kt
      DistributionRecord.kt
      IsbnDistributionRequest.kt
      LoginRequest.kt
      LoginResponse.kt
      LossRequest.kt
      Student.kt
      StreamInfo.kt
    remote/
      ApiService.kt
      RetrofitClient.kt
  ui/
    login/
      LoginActivity.kt
      LoginViewModel.kt
    main/
      MainActivity.kt
    home/
      HomeFragment.kt
      HomeViewModel.kt
    students/
      StudentsAdapter.kt
      StudentsFragment.kt
      StudentsViewModel.kt
    scan/
      ReturnCandidatesAdapter.kt
      ScanFragment.kt
      ScanViewModel.kt
    distributions/
      DistributionsAdapter.kt
      DistributionsFragment.kt
      DistributionsViewModel.kt
  util/
    Resource.kt
    SessionManager.kt
res/
  layout/
    activity_login.xml
    activity_main.xml
    fragment_home.xml
    fragment_students.xml
    fragment_scan.xml
    fragment_distributions.xml
    item_student.xml
    item_distribution.xml
    item_return_candidate.xml
    dialog_add_student.xml
  navigation/
    nav_graph.xml
  menu/
    bottom_nav_menu.xml
  drawable/
    avatar_background.xml
    input_background.xml
    ic_home.xml
    ic_students.xml
    ic_scan.xml
    ic_books.xml
  color/
    bottom_nav_color.xml
```

---

## Coding Conventions — IMPORTANT

### Backend
- No Lombok — write all getters/setters manually
- No ORM magic for relationships — use `@ManyToOne @JoinColumn`
- Field names: camelCase with `Id` suffix (not `ID`)
- All enums annotated with `@Enumerated(EnumType.STRING)`
- `@PrePersist` for auto-setting createdAt fields
- Raw SQL avoided — use derived JPA query methods
- `@Transactional` on service methods that write to DB
- Business logic in Service layer only — never in Controller
- Controllers only: receive request → call service → return ResponseEntity
- Always use `ResponseEntity<?>` with proper HTTP status codes

### Frontend
- All styles as JavaScript objects (no CSS files, no external UI libraries)
- No component libraries — build everything from scratch
- Token stored in `localStorage` as key `token`
- User stored in `localStorage` as key `user` (JSON string)
- All API calls go through functions in `libraryApi.js` — never call `api` directly from pages
- Error messages displayed inline — no alert() calls
- Success messages auto-hide after 4000ms using setTimeout

### Mobile
- MVVM — Fragment observes ViewModel LiveData
- ViewBinding everywhere — no findViewById()
- Coroutines with `viewModelScope.launch` for all async
- `Resource<T>` sealed class wraps all API results
- Always clear binding in `onDestroyView()` to prevent memory leaks
- SessionManager for all token/user data — never access SharedPreferences directly

---

## Current State of the System

### What Is Fully Working
- JWT authentication with role-based access (LIBRARIAN / TEACHER)
- All 8 backend controllers with 40+ endpoints tested via Postman
- React frontend: Login, Dashboard, Classes, Users, Students, Books, Distributions, Borrows, Losses
- Android app: Login, Home, Students list, basic Scan, Distributions list
- Barcode generation (Code 128 via ZXing) for book copies
- Loss report PDF download via browser print

### Known Issues (do not fix unless instructed)
- Stream count does not update dynamically after adding students
- Mobile app does not enforce deactivated user restriction at runtime
- Mobile logout button only on Home fragment — no global logout

---

## CHANGES TO IMPLEMENT

This is the main task. Implement all changes described below completely.

---

### CONTEXT — Why These Changes

The current system generates barcodes (Code 128) for each book copy and
requires printing stickers to stick on books. This is costly for schools.

The new approach:
1. Every physical book already has an ISBN barcode printed on the back cover
   by the publisher. We use this for lookup.
2. Each book copy gets a short unique Accession Number in the system
   (e.g. ACC-0001). The librarian writes this number inside the book once.
3. Teachers use this accession number to assign books — they look at the
   number written inside, type or scan it, confirm the title shown matches,
   then assign to the student.
4. For returns — teacher scans the ISBN on the book cover, system shows
   a table of all students in their stream who have that title, teacher
   ticks the returning student.

This eliminates sticker printing costs entirely.

---

### CHANGE 1 — Database Migration

Run this SQL on the `school_library` database:

```sql
-- Add ISBN field to book_details
ALTER TABLE book_details
ADD COLUMN isbn VARCHAR(20) NULL AFTER publisher;

CREATE INDEX idx_book_isbn ON book_details (isbn);

-- Add accession_number to book_copy
-- This replaces the role of qrCode for physical identification
-- qrCode column stays but is now auto-generated as ACC-XXXX
ALTER TABLE book_copy
ADD COLUMN accession_number VARCHAR(20) NULL AFTER qr_code;

CREATE UNIQUE INDEX idx_accession ON book_copy (accession_number);
```

---

### CHANGE 2 — Backend: BookDetails Model

File: `autolibrary/src/main/java/com/arnold/autolibrary/model/BookDetails.java`

Add field:
```java
@Column(name = "isbn", length = 20)
private String isbn;
```

Add getter and setter:
```java
public String getIsbn() { return isbn; }
public void setIsbn(String isbn) { this.isbn = isbn; }
```

---

### CHANGE 3 — Backend: BookCopy Model

File: `autolibrary/src/main/java/com/arnold/autolibrary/model/BookCopy.java`

Add field:
```java
@Column(name = "accession_number", length = 20, unique = true)
private String accessionNumber;
```

Add getter and setter:
```java
public String getAccessionNumber() { return accessionNumber; }
public void setAccessionNumber(String accessionNumber) {
    this.accessionNumber = accessionNumber;
}
```

---

### CHANGE 4 — Backend: BookDetailsRepository

File: `autolibrary/src/main/java/com/arnold/autolibrary/repository/BookDetailsRepository.java`

Add:
```java
Optional<BookDetails> findByIsbn(String isbn);
boolean existsByIsbn(String isbn);
```

---

### CHANGE 5 — Backend: BookCopyRepository

File: `autolibrary/src/main/java/com/arnold/autolibrary/repository/BookCopyRepository.java`

Add:
```java
Optional<BookCopy> findByAccessionNumber(String accessionNumber);
boolean existsByAccessionNumber(String accessionNumber);
int countByBookDetailsDetailsId(Integer detailsId);

Optional<BookCopy> findFirstByBookDetailsDetailsIdAndStatus(
    Integer detailsId, BookStatus status
);

Optional<BookCopy> findFirstByBookDetailsIsbnAndStatus(
    String isbn, BookStatus status
);
```

---

### CHANGE 6 — Backend: BookService

File: `autolibrary/src/main/java/com/arnold/autolibrary/service/BookService.java`

#### Replace the copy registration method entirely

The old method generated BOOK-{id}-{random} QR codes.
Replace with a method that generates sequential accession numbers
AND keeps the qrCode field populated with the same value for backward compatibility.

```java
/**
 * Generates the next accession number for a book title.
 * Format: ACC-{detailsId}-{sequentialNumber padded to 4 digits}
 * Example: ACC-3-0001, ACC-3-0002
 * The detailsId prefix ensures uniqueness across different titles.
 */
private String generateAccessionNumber(int detailsId, int sequenceNumber) {
    return String.format("ACC-%d-%04d", detailsId, sequenceNumber);
}

/**
 * Registers multiple physical copies of a book title.
 * Each copy receives a unique accession number in format ACC-{titleId}-{seq}.
 * The librarian writes this number inside each physical book once.
 * No stickers or printing required.
 */
@Transactional
public List<BookCopy> registerMultipleCopies(
        int detailsId,
        int quantity,
        LocalDate dateAcquired) {

    BookDetails book = getBookById(detailsId);

    // Find current highest sequence for this title
    int existingCount = bookCopyRepository
        .countByBookDetailsDetailsId(detailsId);

    List<BookCopy> newCopies = new ArrayList<>();

    for (int i = 1; i <= quantity; i++) {
        int sequenceNumber = existingCount + i;
        String accessionNumber = generateAccessionNumber(
            detailsId, sequenceNumber
        );

        BookCopy copy = new BookCopy();
        copy.setBookDetails(book);
        // Use accession number as the qrCode value for compatibility
        copy.setQrCode(accessionNumber);
        copy.setAccessionNumber(accessionNumber);
        copy.setStatus(BookStatus.AVAILABLE);
        copy.setActive(true);
        copy.setDateAcquired(dateAcquired);

        newCopies.add(bookCopyRepository.save(copy));
    }

    // Update total copy count
    book.setCopies(existingCount + quantity);
    bookDetailsRepository.save(book);

    return newCopies;
}

/**
 * Finds a book copy by its accession number.
 * Called when teacher types the number written inside the book.
 */
public BookCopy findByAccessionNumber(String accessionNumber) {
    return bookCopyRepository.findByAccessionNumber(accessionNumber)
        .orElseThrow(() -> new RuntimeException(
            "No book found with accession number: " + accessionNumber +
            ". Check the number written inside the book."
        ));
}

/**
 * Finds a book title by ISBN.
 * Called when teacher scans the barcode on the back cover.
 */
public BookDetails getByIsbn(String isbn) {
    return bookDetailsRepository.findByIsbn(isbn)
        .orElseThrow(() -> new RuntimeException(
            "No book registered with ISBN: " + isbn +
            ". Ask the librarian to register this book title first."
        ));
}
```

---

### CHANGE 7 — Backend: BookController

File: `autolibrary/src/main/java/com/arnold/autolibrary/controller/BookController.java`

Add these endpoints:

```java
/**
 * GET /api/books/isbn/{isbn}
 * Teacher scans ISBN barcode on book back cover.
 * Returns the book title details.
 * Used in mobile app to confirm title before assigning.
 */
@GetMapping("/isbn/{isbn}")
public ResponseEntity<?> getBookByIsbn(@PathVariable String isbn) {
    try {
        BookDetails book = bookService.getByIsbn(isbn);
        return ResponseEntity.ok(book);
    } catch (RuntimeException e) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(e.getMessage());
    }
}

/**
 * GET /api/books/accession/{accessionNumber}
 * Teacher types the number written inside the book.
 * Returns the specific copy with its book details.
 * Teacher confirms title matches the physical book, then assigns.
 */
@GetMapping("/accession/{accessionNumber}")
public ResponseEntity<?> getByAccessionNumber(
        @PathVariable String accessionNumber) {
    try {
        BookCopy copy = bookService
            .findByAccessionNumber(accessionNumber);
        return ResponseEntity.ok(copy);
    } catch (RuntimeException e) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(e.getMessage());
    }
}
```

---

### CHANGE 8 — Backend: DistributionService

File: `autolibrary/src/main/java/com/arnold/autolibrary/service/DistributionService.java`

Add this method:

```java
/**
 * Returns all active distributions of a specific ISBN
 * within a specific stream.
 * 
 * Used in the RETURN flow:
 * Teacher scans ISBN → system shows table of students
 * in their stream who currently have this title →
 * teacher ticks the returning student.
 */
public List<DistributionRecord> getActiveByIsbnAndStream(
        String isbn, int streamId) {

    // Get all students in this stream
    List<Student> streamStudents = studentRepository
        .findByStreamStreamId(streamId);

    Set<Integer> studentIds = streamStudents.stream()
        .map(Student::getStudentId)
        .collect(java.util.stream.Collectors.toSet());

    // Find all DISTRIBUTED records where:
    // - The book copy belongs to a title with this ISBN
    // - The student is in this stream
    return distributionRecordRepository.findAll()
        .stream()
        .filter(d ->
            d.getStatus() == DistributionStatus.DISTRIBUTED &&
            isbn.equals(
                d.getBookCopy()
                 .getBookDetails()
                 .getIsbn()
            ) &&
            studentIds.contains(
                d.getStudent().getStudentId()
            )
        )
        .collect(java.util.stream.Collectors.toList());
}

/**
 * Assigns a book by accession number.
 * Teacher types/scans the accession number written inside the book,
 * confirms the title, selects a student, and the system assigns it.
 * This is the primary assign flow.
 */
@Transactional
public DistributionRecord distributeByAccessionNumber(
        String accessionNumber,
        int studentId,
        int academicYear,
        UserDetails distributedBy) {

    // Find the specific copy by accession number
    BookCopy copy = bookCopyRepository
        .findByAccessionNumber(accessionNumber)
        .orElseThrow(() -> new RuntimeException(
            "No book found with accession number: " + accessionNumber
        ));

    if (copy.getStatus() != BookStatus.AVAILABLE) {
        throw new RuntimeException(
            "This copy is not available. " +
            "Current status: " + copy.getStatus()
        );
    }

    Student student = studentRepository.findById(studentId)
        .orElseThrow(() -> new RuntimeException(
            "Student not found"
        ));

    // Check student does not already have a copy
    // of the same title
    boolean alreadyHasCopy = distributionRecordRepository
        .findAll()
        .stream()
        .anyMatch(d ->
            d.getStatus() == DistributionStatus.DISTRIBUTED &&
            d.getStudent().getStudentId() == studentId &&
            d.getBookCopy().getBookDetails().getDetailsId()
             .equals(copy.getBookDetails().getDetailsId())
        );

    if (alreadyHasCopy) {
        throw new RuntimeException(
            student.getFullName() +
            " already has a copy of: " +
            copy.getBookDetails().getTitleName()
        );
    }

    // Lock the copy
    copy.setStatus(BookStatus.DISTRIBUTED);
    bookCopyRepository.save(copy);

    // Create the distribution record
    DistributionRecord record = new DistributionRecord();
    record.setBookCopy(copy);
    record.setStudent(student);
    record.setDateDistributed(
        new java.sql.Date(System.currentTimeMillis())
    );
    record.setAcademicYear(academicYear);
    record.setDistributedBy(distributedBy);
    record.setStatus(DistributionStatus.DISTRIBUTED);

    return distributionRecordRepository.save(record);
}
```

---

### CHANGE 9 — Backend: DistributionController

File: `autolibrary/src/main/java/com/arnold/autolibrary/controller/DistributionController.java`

Add these endpoints and inner class:

```java
/**
 * GET /api/distributions/isbn/{isbn}/stream/{streamId}
 * Returns table of students in a stream who have a copy
 * of the book with this ISBN currently distributed.
 * 
 * Mobile return flow:
 * Teacher scans ISBN → this endpoint called →
 * table shown → teacher ticks returning student.
 */
@GetMapping("/isbn/{isbn}/stream/{streamId}")
public ResponseEntity<?> getActiveByIsbnAndStream(
        @PathVariable String isbn,
        @PathVariable int streamId) {
    try {
        List<DistributionRecord> records =
            distributionService.getActiveByIsbnAndStream(
                isbn, streamId
            );
        return ResponseEntity.ok(records);
    } catch (RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}

/**
 * POST /api/distributions/by-accession
 * Assigns a book to a student using the accession number
 * written inside the physical book.
 * 
 * Flow:
 * 1. Teacher types accession number from inside book
 * 2. System shows book title for confirmation
 * 3. Teacher selects student
 * 4. Teacher confirms — this endpoint is called
 */
@PostMapping("/by-accession")
public ResponseEntity<?> distributeByAccession(
        @RequestBody AccessionDistributionRequest request) {
    try {
        UserDetails teacher = userDetailsService
            .getUserById(request.getTeacherId());

        DistributionRecord record =
            distributionService.distributeByAccessionNumber(
                request.getAccessionNumber(),
                request.getStudentId(),
                request.getAcademicYear(),
                teacher
            );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(record);
    } catch (RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}

// Add inner class for request body
public static class AccessionDistributionRequest {
    private String accessionNumber;
    private int studentId;
    private int academicYear;
    private int teacherId;

    public String getAccessionNumber() {
        return accessionNumber;
    }
    public void setAccessionNumber(String n) {
        this.accessionNumber = n;
    }
    public int getStudentId() { return studentId; }
    public void setStudentId(int id) { studentId = id; }
    public int getAcademicYear() { return academicYear; }
    public void setAcademicYear(int y) { academicYear = y; }
    public int getTeacherId() { return teacherId; }
    public void setTeacherId(int id) { teacherId = id; }
}
```

---

### CHANGE 10 — Frontend: libraryApi.js

File: `library-frontend/src/services/libraryApi.js`

Add to `bookService`:
```javascript
getByIsbn: (isbn) =>
    api.get(`/books/isbn/${isbn}`),

getByAccession: (accessionNumber) =>
    api.get(`/books/accession/${encodeURIComponent(accessionNumber)}`),
```

Add to `distributionService`:
```javascript
getActiveByIsbnAndStream: (isbn, streamId) =>
    api.get(`/distributions/isbn/${encodeURIComponent(isbn)}/stream/${streamId}`),

distributeByAccession: (data) =>
    api.post('/distributions/by-accession', data),
```

---

### CHANGE 11 — Frontend: Books.jsx

File: `library-frontend/src/pages/Books.jsx`

#### Add ISBN to title registration form state
```javascript
const [titleForm, setTitleForm] = useState({
    titleName: '',
    subject: '',
    gradeLevel: '',
    publisher: '',
    isbn: '',  // ADD THIS
});
```

#### Add ISBN field to the Add Book Title modal form
Add this FormField block inside the add title form,
after the Publisher field and before the modal action buttons:

```jsx
<FormField label="ISBN (for barcode scanning)">
    <input
        style={styles.input}
        placeholder="e.g. 9789966254123"
        value={titleForm.isbn}
        onChange={e => setTitleForm({
            ...titleForm, isbn: e.target.value,
        })}
    />
    <span style={styles.inputHint}>
        Found on the barcode on the back cover of the book.
        Teachers scan this to look up the title during returns.
    </span>
</FormField>
```

#### Update handleAddTitle to include isbn
```javascript
await bookService.create({
    titleName: titleForm.titleName,
    subject: titleForm.subject,
    gradeLevel: parseInt(titleForm.gradeLevel),
    publisher: titleForm.publisher,
    isbn: titleForm.isbn || null,  // ADD THIS
});
```

#### Update copy display in CopyCard component
Replace the QR code display to show accession number instead:

In `CopyCard` function, change:
```jsx
<div style={copyStyles.qrCode}>{copy.qrCode}</div>
```
To:
```jsx
<div style={copyStyles.qrCode}>
    {copy.accessionNumber || copy.qrCode}
</div>
```

#### Update print area to show accession numbers
In the print section, change the copy identifier label
from `copy.qrCode` to `copy.accessionNumber || copy.qrCode`
in both the preview modal and the hidden print area.

#### Add accession number info box to Add Copies modal
Add this info box before the quantity field in the Add Copies modal:

```jsx
<div style={styles.infoBox}>
    📌 Each copy will automatically receive a unique
    accession number (e.g. ACC-1-0001).
    Write this number inside the front cover of each book.
    Teachers will use this number to assign books to students.
</div>
```

---

### CHANGE 12 — Frontend: Distributions.jsx

File: `library-frontend/src/pages/Distributions.jsx`

#### Update scan input hint text
Change the scan section label to reflect accession numbers:

```jsx
<div style={styles.scanLabel}>
    {mode === MODES.ASSIGN
        ? '📦 Enter accession number to assign'
        : '↩️ Scan ISBN barcode to return'
        : '⚠️ Enter accession number to flag lost'}
</div>

<div style={styles.scanHint}>
    {mode === MODES.ASSIGN
        ? 'Type the number written inside the book cover, then press Enter or click Look Up.'
        : mode === MODES.RETURN
        ? 'Point scanner at the ISBN barcode on the back cover of the book being returned.'
        : 'Type the accession number of the lost book.'}
</div>
```

#### Update handleScan to detect ISBN vs accession number

Replace the existing `handleScan` function with:

```javascript
const handleScan = async (e) => {
    if (e.key !== 'Enter') return;
    const code = barcodeInput.trim();
    if (!code) return;

    setScanLoading(true);
    setScanError('');
    setScannedBook(null);
    setActiveDistribution(null);

    try {
        // Detect if the scanned/typed value is an ISBN
        // ISBNs are 10 or 13 digits only
        const cleanCode = code.replace(/-/g, '');
        const isIsbn = /^[0-9]{10}$|^[0-9]{13}$/.test(cleanCode);

        if (isIsbn && mode === MODES.RETURN) {
            // ISBN scan during return — look up by ISBN
            const res = await bookService.getByIsbn(cleanCode);
            // getByIsbn returns BookDetails not BookCopy
            // Wrap it so scannedBook has consistent shape
            setScannedBook({
                bookDetails: res.data,
                isbn: cleanCode,
                isIsbnLookup: true,
            });

            // Load return candidates table
            const year = new Date().getFullYear();
            await loadReturnCandidatesByIsbn(cleanCode);

        } else {
            // Accession number entry — look up specific copy
            const res = await bookService.getByAccession(code);
            setScannedBook(res.data);

            // For return and loss — check it is distributed
            if (mode === MODES.RETURN || mode === MODES.LOSS) {
                if (res.data.status !== 'DISTRIBUTED') {
                    setScanError(
                        `This copy is ${res.data.status.toLowerCase()}, not currently distributed.`
                    );
                } else {
                    // Find active distribution record for this copy
                    const year = new Date().getFullYear();
                    const distRes = await distributionService
                        .getByYear(year);
                    const active = distRes.data.find(d =>
                        d.bookCopy?.qrCode === res.data.qrCode &&
                        d.status === 'DISTRIBUTED'
                    );
                    setActiveDistribution(active || null);
                }
            }

            if (mode === MODES.ASSIGN &&
                res.data.status !== 'AVAILABLE') {
                setScanError(
                    `This copy is ${res.data.status.toLowerCase()}. ` +
                    `Only AVAILABLE copies can be assigned.`
                );
            }
        }

    } catch (err) {
        if (err.response?.status === 404) {
            setScanError(
                isIsbn
                    ? 'No book registered with this ISBN. Ask the librarian to register it.'
                    : 'No book found with this accession number. Check the number inside the book.'
            );
        } else {
            setScanError('Failed to look up book. Is the server running?');
        }
    } finally {
        setScanLoading(false);
    }
};
```

Add the return candidates state and loader:
```javascript
const [returnCandidates, setReturnCandidates] = useState([]);
const [loadingCandidates, setLoadingCandidates] = useState(false);

const loadReturnCandidatesByIsbn = async (isbn) => {
    if (!user?.streamId && user?.role !== 'LIBRARIAN') return;
    setLoadingCandidates(true);
    try {
        // For librarian — show all streams (pass 0 to mean all)
        // Adapt based on your needs
        const year = new Date().getFullYear();
        const distRes = await distributionService.getByYear(year);
        const candidates = distRes.data.filter(d =>
            d.bookCopy?.bookDetails?.isbn === isbn &&
            d.status === 'DISTRIBUTED'
        );
        setReturnCandidates(candidates);
    } catch {
        setReturnCandidates([]);
    } finally {
        setLoadingCandidates(false);
    }
};
```

#### Update handleAssign to use accession number endpoint
```javascript
const handleAssign = async () => {
    if (!scannedBook || !selectedStudent) return;
    setSubmitting(true);
    setError('');

    try {
        await distributionService.distributeByAccession({
            accessionNumber: scannedBook.accessionNumber
                || scannedBook.qrCode,
            studentId: selectedStudent.studentId,
            academicYear: new Date().getFullYear(),
            teacherId: user.userId,
        });

        showSuccess(
            `✅ "${scannedBook.bookDetails?.titleName}" ` +
            `assigned to ${selectedStudent.fullName}`
        );
        resetScanState();
        loadRecentActivity();

        setTimeout(() => {
            // Re-focus scan input
        }, 100);

    } catch (err) {
        setError(err.response?.data || 'Failed to assign book');
    } finally {
        setSubmitting(false);
    }
};
```

#### Add return candidates table to the scanned book info card
After the `holderInfo` div and before the action buttons,
add a return candidates table that shows when mode is RETURN
and an ISBN was scanned:

```jsx
{/* Return candidates table — ISBN scan in return mode */}
{mode === MODES.RETURN &&
 scannedBook?.isIsbnLookup &&
 returnCandidates.length > 0 && (
    <div style={styles.returnTable}>
        <div style={styles.returnTableHeader}>
            Students with this book — tap Return to confirm
        </div>
        {loadingCandidates ? (
            <div style={styles.loadingText}>Loading...</div>
        ) : (
            returnCandidates.map((record, i) => (
                <div key={i} style={styles.returnRow}>
                    <div style={styles.returnStudentInfo}>
                        <div style={styles.returnStudentName}>
                            {record.student?.fullName}
                        </div>
                        <div style={styles.returnStudentMeta}>
                            {record.student?.admissionNumber}
                            {' • '}Issued: {record.dateDistributed}
                        </div>
                    </div>
                    <button
                        style={styles.returnTickBtn}
                        onClick={() => handleReturnByRecord(record)}
                        disabled={submitting}
                    >
                        ✓ Return
                    </button>
                </div>
            ))
        )}
        {returnCandidates.length === 0 && !loadingCandidates && (
            <div style={styles.loadingText}>
                No active distributions found for this title
            </div>
        )}
    </div>
)}
```

Add handler:
```javascript
const handleReturnByRecord = async (record) => {
    setSubmitting(true);
    try {
        await distributionService.returnBook(
            record.bookCopy?.qrCode
        );
        showSuccess(
            `✅ Book returned by ${record.student?.fullName}`
        );
        // Remove from candidates list
        setReturnCandidates(prev =>
            prev.filter(r => r.distributionId !== record.distributionId)
        );
    } catch (err) {
        setError(err.response?.data || 'Failed to return');
    } finally {
        setSubmitting(false);
    }
};
```

Add styles:
```javascript
returnTable: {
    marginTop: 14,
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
},
returnTableHeader: {
    background: '#f7fafc',
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#555',
    borderBottom: '1px solid #e0e0e0',
},
returnRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid #f0f2f5',
    gap: 10,
},
returnStudentInfo: { flex: 1 },
returnStudentName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1a2e',
},
returnStudentMeta: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
},
returnTickBtn: {
    padding: '6px 14px',
    background: '#2b6cb0',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
},
```

Also update the scan input placeholder and label:
- ASSIGN mode: "Type accession number from inside book cover..."
- RETURN mode: "Scan ISBN barcode on book back cover, OR type accession number..."

---

### CHANGE 13 — Mobile: ApiService.kt

File: `mobileLib/app/src/main/java/com/arnold/mobileLib/data/remote/ApiService.kt`

Add:
```kotlin
@GET("books/isbn/{isbn}")
suspend fun getBookByIsbn(
    @Path("isbn") isbn: String
): Response<BookCopy>

@GET("books/accession/{accessionNumber}")
suspend fun getBookByAccession(
    @Path("accessionNumber") accessionNumber: String
): Response<BookCopy>

@GET("distributions/isbn/{isbn}/stream/{streamId}")
suspend fun getActiveByIsbnAndStream(
    @Path("isbn") isbn: String,
    @Path("streamId") streamId: Int
): Response<List<DistributionRecord>>

@POST("distributions/by-accession")
suspend fun distributeByAccession(
    @Body request: AccessionDistributionRequest
): Response<DistributionRecord>
```

---

### CHANGE 14 — Mobile: New Model

Create file:
`mobileLib/app/src/main/java/com/arnold/mobileLib/data/model/AccessionDistributionRequest.kt`

```kotlin
package com.arnold.mobileLib.data.model

data class AccessionDistributionRequest(
    val accessionNumber: String,
    val studentId: Int,
    val academicYear: Int,
    val teacherId: Int
)
```

Also update `BookCopy.kt` to add `accessionNumber` field:
```kotlin
data class BookCopy(
    val bookId: Int,
    val qrCode: String,
    val accessionNumber: String?,   // ADD THIS
    val status: String,
    val dateAcquired: String?,
    val bookDetails: BookDetails?
)
```

---

### CHANGE 15 — Mobile: ScanViewModel.kt

File: `mobileLib/app/src/main/java/com/arnold/mobileLib/ui/scan/ScanViewModel.kt`

Add state:
```kotlin
private val _returnCandidates =
    MutableLiveData<Resource<List<DistributionRecord>>>()
val returnCandidates: LiveData<Resource<List<DistributionRecord>>> =
    _returnCandidates
```

Add method to look up by accession number:
```kotlin
fun lookupByAccession(accessionNumber: String) {
    _scannedBook.value = Resource.Loading()
    viewModelScope.launch {
        try {
            val res = RetrofitClient.instance
                .getBookByAccession(accessionNumber)
            if (res.isSuccessful) {
                _scannedBook.value = Resource.Success(res.body()!!)
            } else if (res.code() == 404) {
                _scannedBook.value = Resource.Error(
                    "No book with accession number: $accessionNumber\n" +
                    "Check the number written inside the book."
                )
            } else {
                _scannedBook.value = Resource.Error("Lookup failed")
            }
        } catch (e: Exception) {
            _scannedBook.value = Resource.Error(
                "Network error: ${e.message}"
            )
        }
    }
}
```

Add method to look up return candidates by ISBN:
```kotlin
fun loadReturnCandidatesByIsbn(isbn: String, streamId: Int) {
    _returnCandidates.value = Resource.Loading()
    viewModelScope.launch {
        try {
            val res = RetrofitClient.instance
                .getActiveByIsbnAndStream(isbn, streamId)
            if (res.isSuccessful) {
                val records = res.body() ?: emptyList()
                if (records.isEmpty()) {
                    _returnCandidates.value = Resource.Error(
                        "No students in your stream currently have this book"
                    )
                } else {
                    _returnCandidates.value = Resource.Success(records)
                }
            } else {
                _returnCandidates.value =
                    Resource.Error("Failed to load")
            }
        } catch (e: Exception) {
            _returnCandidates.value =
                Resource.Error("Network error: ${e.message}")
        }
    }
}
```

Update `assignBook` to accept accession number:
```kotlin
fun assignByAccession(
        accessionNumber: String,
        studentId: Int,
        teacherId: Int
) {
    _actionResult.value = Resource.Loading()
    viewModelScope.launch {
        try {
            val year = Calendar.getInstance().get(Calendar.YEAR)
            val res = RetrofitClient.instance.distributeByAccession(
                AccessionDistributionRequest(
                    accessionNumber = accessionNumber,
                    studentId = studentId,
                    academicYear = year,
                    teacherId = teacherId
                )
            )
            if (res.isSuccessful) {
                _actionResult.value = Resource.Success(
                    "Book assigned successfully ✅"
                )
            } else {
                val err = res.errorBody()?.string()
                _actionResult.value = Resource.Error(
                    err ?: "Failed to assign"
                )
            }
        } catch (e: Exception) {
            _actionResult.value = Resource.Error(
                "Network error: ${e.message}"
            )
        }
    }
}
```

---

### CHANGE 16 — Mobile: ScanFragment.kt

File: `mobileLib/app/src/main/java/com/arnold/mobileLib/ui/scan/ScanFragment.kt`

#### Update processImageWithScanner to accept EAN-13 (ISBN format)

Update the barcode acceptance logic:
```kotlin
val found = barcodes.firstOrNull { barcode ->
    val value = barcode.rawValue
    if (value.isNullOrBlank()) return@firstOrNull false

    // Accept EAN-13 (ISBN on book back covers)
    val isIsbn = barcode.format == Barcode.FORMAT_EAN_13

    // Accept our accession number format ACC-X-XXXX
    val isAccession = value.startsWith("ACC-")

    isIsbn || isAccession
}

if (found != null) {
    isScanning = false
    lastScannedCode = found.rawValue!!
    val isIsbn = found.format == Barcode.FORMAT_EAN_13

    requireActivity().runOnUiThread {
        if (isIsbn && !isAssignMode) {
            // ISBN scan in return mode
            binding.tvScanHint.text = "ISBN: $lastScannedCode — loading..."
            val app = requireActivity().application as SchoolLibraryApp
            val streamId = app.sessionManager.getStreamId() ?: return@runOnUiThread
            viewModel.loadReturnCandidatesByIsbn(lastScannedCode, streamId)
            // Show book title info
            viewModel.lookupBook(lastScannedCode, isIsbn = true)
        } else {
            // Accession number — direct copy lookup
            binding.tvScanHint.text = "Looking up: $lastScannedCode"
            viewModel.lookupByAccession(lastScannedCode)
        }
    }
}
```

#### Add return candidates RecyclerView to the scan fragment layout

In `fragment_scan.xml`, add inside `scrollBookInfo` LinearLayout
after the `layoutHolder` section:

```xml
<!-- Return candidates table -->
<LinearLayout
    android:id="@+id/layoutReturnCandidates"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layout_marginTop="10dp"
    android:visibility="gone">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Tap ✓ Return next to the student returning this book"
        android:textSize="12sp"
        android:textColor="#555555"
        android:layout_marginBottom="6dp"/>

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerReturnCandidates"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:nestedScrollingEnabled="false"/>

    <TextView
        android:id="@+id/tvNoCandidates"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No students in your stream have this book assigned"
        android:textSize="13sp"
        android:textColor="#888888"
        android:gravity="center"
        android:padding="16dp"
        android:visibility="gone"/>

</LinearLayout>
```

#### Wire up return candidates adapter in ScanFragment

Add to `onViewCreated`:
```kotlin
setupReturnCandidates()
```

Add method:
```kotlin
private fun setupReturnCandidates() {
    val returnAdapter = ReturnCandidatesAdapter { record ->
        // Teacher tapped ✓ Return
        val qrCode = record.bookCopy?.qrCode ?: return@ReturnCandidatesAdapter
        viewModel.returnBook(qrCode)
    }
    binding.recyclerReturnCandidates.layoutManager =
        LinearLayoutManager(requireContext())
    binding.recyclerReturnCandidates.adapter = returnAdapter

    viewModel.returnCandidates.observe(viewLifecycleOwner) { result ->
        when (result) {
            is Resource.Loading -> {
                binding.layoutReturnCandidates.visibility = View.VISIBLE
                binding.tvNoCandidates.visibility = View.GONE
            }
            is Resource.Success -> {
                binding.layoutReturnCandidates.visibility = View.VISIBLE
                val candidates = result.data
                returnAdapter.submitList(candidates)
                if (candidates.isEmpty()) {
                    binding.tvNoCandidates.visibility = View.VISIBLE
                } else {
                    binding.tvNoCandidates.visibility = View.GONE
                }
            }
            is Resource.Error -> {
                binding.layoutReturnCandidates.visibility = View.VISIBLE
                binding.tvNoCandidates.visibility = View.VISIBLE
                binding.tvNoCandidates.text = result.message
                returnAdapter.submitList(emptyList())
            }
            null -> {}
        }
    }
}
```

#### Update assign button handler to use accession number
```kotlin
binding.btnAssign.setOnClickListener {
    val student = selectedStudent ?: run {
        showResult("Please select a student first", false)
        return@setOnClickListener
    }
    val app = requireActivity().application as SchoolLibraryApp
    val teacherId = app.sessionManager.getUserId()

    // Use accession number from the scanned book copy
    viewModel.assignByAccession(
        accessionNumber = lastScannedCode,
        studentId = student.studentId,
        teacherId = teacherId
    )
}
```

#### Update resetScan to also clear return candidates
```kotlin
private fun resetScan() {
    lastScannedCode = ""
    selectedStudent = null
    isScanning = true
    binding.scrollBookInfo.visibility = View.GONE
    binding.layoutHolder.visibility = View.GONE
    binding.layoutStudentPicker.visibility = View.GONE
    binding.layoutReturnCandidates.visibility = View.GONE   // ADD
    binding.btnAssign.visibility = View.GONE
    binding.btnReturn.visibility = View.GONE
    binding.tvScanResult.visibility = View.GONE
    binding.etStudentSearch.setText("")
    viewModel.clearState()
    updateModeUI()
}
```

---

### CHANGE 17 — Mobile: Update ScanViewModel.clearState()

```kotlin
fun clearState() {
    _scannedBook.value = null
    _activeDistribution.value = null
    _actionResult.value = null
    _returnCandidates.value = null   // ADD THIS
}
```

---

## How the New Flow Works After Changes

### Teacher assigns a book (ASSIGN mode):
```
1. Teacher opens Scan tab → Assign mode
2. Opens the book → sees number written inside: ACC-3-0047
3. Types or scans "ACC-3-0047" in the input
4. System shows: "Mathematics Form 2 — Copy 47 — AVAILABLE"
5. Teacher confirms this matches the physical book ✓
6. Teacher selects student from the list
7. Taps Assign — done in under 15 seconds
```

### Teacher returns a book (RETURN mode):
```
1. Teacher opens Scan tab → Return mode
2. Points camera at ISBN barcode on book back cover
3. System shows book title + table:
   ┌───────────────────────────────────┐
   │ John Mwangi    ADM001  ✓ Return  │
   │ Alice Kamau    ADM047  ✓ Return  │
   └───────────────────────────────────┘
4. Teacher taps ✓ Return next to returning student
5. Done — under 10 seconds
```

### No stickers. No printing. Uses numbers already on/in the books.

---

## After Implementing All Changes

Run backend:
```bash
cd autolibrary && mvn spring-boot:run
```

Run frontend:
```bash
cd library-frontend && npm start
```

Test these specific scenarios:
1. Register a book title with an ISBN number
2. Register 5 copies — verify accession numbers ACC-X-0001 to ACC-X-0005 are generated
3. POST /api/books/accession/ACC-X-0001 — verify it returns the correct copy
4. POST /api/distributions/by-accession with the accession number
5. GET /api/distributions/isbn/{isbn}/stream/{streamId} — verify returns table
6. On mobile: type an accession number → verify book info appears
7. On mobile: scan ISBN barcode → verify return candidates table appears

---

## Questions for Ano (Project Owner)

1. Should teachers be able to type accession numbers manually on mobile
   (without camera), as a fallback for when camera is not working?
   Recommended: YES — add a text input fallback.

2. For the ASSIGN flow on mobile — should the student list appear
   BEFORE or AFTER the teacher enters the accession number?
   Current design: student selected first, then accession number entered.
   Alternative: accession number first, then student selected.
   Recommended: Accession number first (matches the physical workflow —
   teacher has the book in hand, types the number, confirms title, picks student).

3. Should the librarian desktop also support accession number lookup
   (not just the mobile app)?
   Recommended: YES — the scan input on Distributions page already
   handles this after Change 12.

