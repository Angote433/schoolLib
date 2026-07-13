<div align="center">

# 📚 School Library Management System

**A full-stack library management system built for Kenyan secondary schools**

Digitizing book distribution, borrowing, barcode tracking, and loss reporting —
replacing manual record keeping with a fast, role-based system.

![Java](https://img.shields.io/badge/Java-25-orange?style=flat-square&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.x-brightgreen?style=flat-square&logo=springboot)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square&logo=mysql)
![Android](https://img.shields.io/badge/Android-Kotlin-green?style=flat-square&logo=android)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Author](#-author)

---

## 🏫 Overview

The School Library Management System is a multi-platform application designed
to replace the manual, paper-based library processes in Kenyan secondary schools.
It handles everything from registering books and generating barcodes to
tracking distributions, borrowing, and loss reporting.

The system serves three roles:

| Role | Description | Platform |
|------|-------------|----------|
| **Librarian** | Full system access — manages all books, users, classes, reports | Desktop (React Web App) |
| **Teacher** | Scans books, manages own stream students, flags losses | Android Mobile App |
| **Secretary** | Receives printed loss reports from librarian | No system login — paper based |

> The school secretary does **not** have a system login. The librarian generates
> and downloads loss reports as PDF and forwards them manually.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│                                                         │
│  ┌─────────────────┐      ┌──────────────────────────┐  │
│  │  React Web App  │      │  Android Mobile App      │  │
│  │  (Librarian)    │      │  (Teacher)               │  │
│  │  localhost:3000 │      │  Kotlin + ML Kit         │  │
│  └────────┬────────┘      └───────────┬──────────────┘  │
│           │                           │                  │
└───────────┼───────────────────────────┼──────────────────┘
            │        HTTPS / JWT        │
            ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                             │
│                                                         │
│          Spring Boot 3.5.x  (port 8080)                 │
│          ┌─────────────────────────────┐                │
│          │  Spring Security + JWT      │                │
│          │  8 REST Controllers         │                │
│          │  40+ Endpoints              │                │
│          │  ZXing Barcode Generation   │                │
│          └──────────────┬──────────────┘                │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │  JDBC / Hibernate
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE LAYER                          │
│                                                         │
│              MySQL 8.0                                  │
│              9 Tables, Relationships, Indexes           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 📦 Book Management
- Register book titles with subject, grade level, and publisher
- Register multiple physical copies at once — up to 500 per batch
- **Auto-generate unique Code 128 barcode** per physical copy
- View all copies with status — Available, Distributed, Borrowed, Lost
- Select copies and print barcode sheets via browser print dialog
- Filter books by grade level and search by title or subject

### 🏫 Class & Stream Management
- Create grade level classes with academic years
- Add multiple streams per class (7A, 7B, 7C...)
- Assign teachers to streams with visual assignment status
- Expandable class cards showing all streams at a glance

### 👥 User Management
- Librarian creates teacher and librarian accounts
- JWT-based role access control — LIBRARIAN and TEACHER
- Activate and deactivate accounts with confirmation dialogs
- Teacher cards show assigned stream information
- Search and filter users by name, username, or role

### 🎓 Student Management
- View students by class and stream with cascading selectors
- Stream summary bar showing active count, capacity, and teacher
- Add students with unique admission number enforcement
- Student profile view with basic details
- Active/inactive toggle with full history preservation
- Search by name or admission number

### 📦 Book Distribution *(Librarian & Teacher)*
- **Assign:** Scan barcode → search student → assign in seconds
- **Return:** Scan barcode → confirm return — one tap
- **View Active:** All currently distributed books with student info
- **End of Term Audit:** Find unreturned books → flag as lost from a list
- USB barcode scanner support on desktop — works like a keyboard
- Bluetooth scanner app support for wireless scanning

### 📖 Library Borrowing
- **Issue:** Scan barcode → select student → set due date → issue
- **Return:** Scan barcode → one-tap confirmation
- **Active Borrows:** Full list with overdue highlighting
- **Overdue Tracking:** Automatic detection with days-overdue count
- Flag overdue books as lost → loss report auto-created
- Due date defaults to 2 weeks, fully adjustable

### ⚠️ Loss Reports
- View pending losses and full report history
- Filter by source — Distribution or Borrowing
- Search any student's loss history by admission number
- **Resolve** — mark settled with notes (paid, found, etc.)
- **Write Off** — school absorbs the cost with optional notes
- **Download as PDF** — formatted report ready to forward to secretary
- Report includes summary table with counts by source and status

### 🔐 Security
- JWT authentication — tokens expire after 24 hours
- Role-based endpoint protection per HTTP method
- Passwords hashed with BCrypt — plain text never stored
- Stateless REST API — no server sessions
- CORS configured for specific origins

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Java | 25 | Programming language |
| Spring Boot | 3.5.x | REST API framework |
| Spring Security | 6.x | Authentication & authorization |
| JWT (jjwt) | 0.11.5 | Token-based authentication |
| Hibernate / JPA | 6.6.x | ORM — database mapping |
| MySQL | 8.0 | Relational database |
| HikariCP | Built-in | Database connection pooling |
| ZXing | 3.5.2 | Code 128 barcode generation |
| Maven | 3.8+ | Dependency management |

### Frontend (Desktop — Librarian)
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| React Router | v6 | Client-side routing |
| Axios | 1.x | HTTP client with interceptors |
| Context API | Built-in | Global authentication state |

### Mobile (Android — Teacher)
| Technology | Purpose |
|-----------|---------|
| Kotlin | Android development language |
| CameraX | Camera preview and image capture |
| ML Kit Barcode Scanning | Real-time Code 128 barcode detection |
| Retrofit2 | HTTP client for API calls |
| Gson | JSON serialization |
| Jetpack Navigation | Fragment navigation |
| ViewModel + LiveData | MVVM architecture |
| SharedPreferences | JWT token storage |

---

## 📁 Project Structure

```
school-library-system/
│
├── autolibrary/                         # Spring Boot Backend
│   └── src/main/java/com/arnold/autolibrary/
│       ├── config/
│       │   └── SecurityConfig.java       # JWT + CORS config
│       ├── controller/
│       │   ├── AuthController.java       # Login + registration
│       │   ├── BookController.java       # Books + barcode images
│       │   ├── BorrowController.java     # Library borrows
│       │   ├── DistributionController.java  # Book assignments
│       │   ├── LossReportController.java # Loss tracking
│       │   ├── SchoolClassController.java
│       │   ├── StreamController.java
│       │   ├── StudentController.java
│       │   └── UserDetailsController.java
│       ├── model/
│       │   ├── BookCopy.java
│       │   ├── BookDetails.java
│       │   ├── BorrowRecord.java
│       │   ├── DistributionRecord.java
│       │   ├── LossReport.java
│       │   ├── SchoolClass.java
│       │   ├── Stream.java
│       │   ├── Student.java
│       │   ├── UserDetails.java
│       │   └── enums/
│       │       ├── BookStatus.java
│       │       ├── BorrowStatus.java
│       │       ├── DistributionStatus.java
│       │       ├── LossSource.java
│       │       ├── ResolutionStatus.java
│       │       └── Role.java
│       ├── repository/                   # JPA repositories
│       ├── security/
│       │   ├── CustomUserDetailsService.java
│       │   └── JwtAuthFilter.java
│       ├── service/                      # Business logic
│       └── util/
│           ├── BarcodeGenerator.java     # Code 128 generation
│           └── JwtUtil.java
│
├── library-frontend/                    # React Frontend (Librarian)
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx           # Global auth state
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx             # Stats + quick overview
│       │   ├── Classes.jsx               # Classes + streams
│       │   ├── Users.jsx                 # User management
│       │   ├── Students.jsx              # Student management
│       │   ├── Books.jsx                 # Books + barcode printing
│       │   ├── Distributions.jsx         # Book assignments
│       │   ├── Borrows.jsx               # Library borrows
│       │   └── Losses.jsx                # Loss reports + download
│       ├── services/
│       │   ├── api.js                    # Axios instance + interceptors
│       │   └── libraryApi.js             # All API service functions
│       ├── components/
│       │   └── Layout.jsx                # Sidebar + navigation
│       └── App.jsx                       # Routes + protected routes
│
├── mobileLib/                           # Android App (Teacher)
│   └── app/src/main/java/com/arnold/mobileLib/
│       ├── data/
│       │   ├── model/                    # Kotlin data classes
│       │   └── remote/
│       │       ├── ApiService.kt         # Retrofit interface
│       │       └── RetrofitClient.kt     # HTTP client setup
│       ├── ui/
│       │   ├── login/                    # Login screen
│       │   ├── home/                     # Dashboard fragment
│       │   ├── students/                 # Students list + add
│       │   ├── scan/                     # Camera + barcode scan
│       │   └── distributions/            # Active books out
│       ├── util/
│       │   ├── SessionManager.kt         # JWT token storage
│       │   └── Resource.kt               # API state wrapper
│       └── SchoolLibraryApp.kt           # Application class
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

```
Java 21+         https://adoptium.net/
Maven 3.8+       https://maven.apache.org/
MySQL 8.0+       https://dev.mysql.com/downloads/
Node.js 18+      https://nodejs.org/
Android Studio   https://developer.android.com/studio (for mobile)
```

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/school-library-system.git
cd school-library-system
```

### 2. Database Setup

```bash
# Create the database
mysql -u root -p -e "CREATE DATABASE school_library;"

# Import the schema
mysql -u root -p school_library < autolibrary/src/main/resources/library_system_v2.sql
```

### 3. Backend Configuration

Open `autolibrary/src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/school_library?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=your_mysql_username
spring.datasource.password=your_mysql_password

# JWT — change this secret in production
jwt.secret=schoollibrarySystemSecretKeyForJWTTokenGenerationMustBeLong
jwt.expiration=86400000

# Server port
server.port=8080
```

### 4. Start the Backend

```bash
cd autolibrary
mvn spring-boot:run
```

Confirm startup is successful — the console should show:

```
SECURITY CONFIG LOADED
Started AutolibraryApplication in X seconds
```

> ⚠️ The line `Using generated security password` should **not** appear.
> If it does, verify `CustomUserDetailsService.java` exists in the `security` package.

### 5. Create the First Librarian Account

```http
POST http://localhost:8080/api/auth/register-librarian
Content-Type: application/json

{
  "fullName": "Head Librarian",
  "userName": "librarian",
  "password": "yourpassword"
}
```

> This endpoint only works once. A second call returns an error if a librarian exists.

### 6. Start the Frontend

```bash
cd library-frontend
npm install
npm start
```

Open **http://localhost:3000** and log in with your librarian credentials.

### 7. Android App Setup

Open `mobileLib/` in Android Studio.

Update the base URL in `RetrofitClient.kt`:

```kotlin
// For Android emulator
private const val BASE_URL = "http://10.0.2.2:8080/api/"

// For physical device on same WiFi — use your PC's local IP
private const val BASE_URL = "http://192.168.1.x:8080/api/"
```

Connect your Android device with **USB Debugging** enabled and click **Run**.

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/login` | Public | Login — returns JWT token |
| `POST` | `/api/auth/register-librarian` | Public | Create first librarian (once only) |

All other endpoints require:
```http
Authorization: Bearer <your_jwt_token>
```

### Classes & Streams

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/classes` | Both |
| `POST` | `/api/classes` | Librarian |
| `GET` | `/api/streams/class/{classId}` | Both |
| `POST` | `/api/streams?classId={id}` | Librarian |
| `PUT` | `/api/streams/{id}/teacher?userId={id}` | Librarian |

### Users

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/users` | Librarian |
| `POST` | `/api/users` | Librarian |
| `GET` | `/api/users/role/{role}` | Librarian |
| `PUT` | `/api/users/{id}/deactivate` | Librarian |
| `PUT` | `/api/users/{id}/activate` | Librarian |
| `PUT` | `/api/users/{id}/stream?streamId={id}` | Librarian |

### Students

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/students/stream/{streamId}` | Both |
| `POST` | `/api/students?streamId={id}` | Both |
| `GET` | `/api/students/{id}` | Both |
| `GET` | `/api/students/admission/{admNo}` | Both |
| `PUT` | `/api/students/{id}/transfer?newStreamId={id}` | Both |
| `PUT` | `/api/students/{id}/deactivate` | Both |

### Books

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/books` | Both |
| `POST` | `/api/books` | Librarian |
| `POST` | `/api/books/{id}/copies?quantity={n}&dateAcquired={date}` | Librarian |
| `GET` | `/api/books/copies/{bookId}` | Both |
| `GET` | `/api/books/scan/{qrCode}` | Both |
| `GET` | `/api/books/copies/{copyId}/qr-image` | Both |

### Distributions

| Method | Endpoint | Access |
|--------|----------|--------|
| `POST` | `/api/distributions` | Both |
| `PUT` | `/api/distributions/return/{qrCode}` | Both |
| `GET` | `/api/distributions/year/{year}` | Both |
| `GET` | `/api/distributions/stream/{streamId}/year/{year}` | Both |
| `POST` | `/api/distributions/loss` | Both |

### Borrows

| Method | Endpoint | Access |
|--------|----------|--------|
| `POST` | `/api/borrows` | Both |
| `PUT` | `/api/borrows/return/{qrCode}` | Both |
| `GET` | `/api/borrows/active` | Both |
| `GET` | `/api/borrows/overdue` | Both |
| `POST` | `/api/borrows/loss` | Both |

### Loss Reports

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/losses` | Both |
| `GET` | `/api/losses/pending` | Both |
| `GET` | `/api/losses/student/{studentId}` | Both |
| `GET` | `/api/losses/source/{source}` | Both |
| `PUT` | `/api/losses/{id}/resolve` | Librarian |
| `PUT` | `/api/losses/{id}/writeoff` | Librarian |

---

## 🗄 Database Schema

```
school_class
  classId, className, gradeLevel, academicYear

stream
  streamId, streamName, classId (FK), teacherId (FK), capacity, isActive

user_details
  userId, fullName, userName, passwordHash, role (LIBRARIAN|TEACHER),
  streamId (FK), isActive, createdAt

student
  studentId, admissionNumber (UNIQUE), fullName, streamId (FK),
  yearEnrolled, isActive, createdAt

book_details
  detailsId, titleName, subject, gradeLevel, publisher, copies, createdAt

book_copy
  bookId, detailsId (FK), qrCode (UNIQUE), status (AVAILABLE|BORROWED|
  DISTRIBUTED|LOST), isActive, dateAcquired

distribution_record
  distributionId, bookId (FK), studentId (FK), dateDistributed,
  dateReturned, academicYear, distributedBy (FK), status

borrow_record
  borrowId, bookId (FK), studentId (FK), dateBorrowed, dateDue,
  dateReturned, issuedBy (FK), status (ACTIVE|RETURNED|OVERDUE|LOST)

loss_report
  reportId, copyId (FK), studentId (FK), dateFlagged,
  source (DISTRIBUTION|BORROWING), reason,
  resolutionStatus (PENDING|RESOLVED|WRITTEN_OFF),
  dateResolved, notes
```

---

## 🖨 Barcode Scanning

The system uses **Code 128** barcodes — the library industry standard.

```
Each book copy gets a unique ID:
  Format:  BOOK-{titleId}-{random8chars}
  Example: BOOK-3-A1B2C3D4
```

### Desktop Scanning (Librarian)

A USB barcode scanner connects as a keyboard device:

```
1. Librarian clicks the scan input field
2. Points scanner at book barcode
3. Scanner reads Code 128 → types value → presses Enter
4. System instantly looks up the book
```

No driver or special software needed — works out of the box.

### Mobile Scanning (Teacher)

The Android app uses **Google ML Kit** with the device camera:

```
1. Teacher opens Scan tab
2. Camera preview opens automatically
3. Points phone camera at barcode
4. ML Kit detects Code 128 in real time
5. Book info appears on screen
```

### Wireless Desktop Scanning Options

| Option | How it works | Cost |
|--------|-------------|------|
| Bluetooth Scanner App | Android app pairs as wireless keyboard scanner | Free app |
| USB OTG | Phone connects as USB camera | USB OTG cable |
| IP Webcam | Phone camera streamed over WiFi | Free app |

---

## 🔒 Permissions Summary

| Feature | Librarian | Teacher |
|---------|-----------|---------|
| Create/manage users | ✅ | ❌ |
| Manage classes & streams | ✅ | ❌ |
| Register books & generate barcodes | ✅ | ❌ |
| Print barcode sheets | ✅ | ❌ |
| Add students | ✅ | ✅ (own stream only) |
| Scan to assign books | ✅ | ✅ |
| Scan to return books | ✅ | ✅ |
| Issue library borrows | ✅ | ❌ |
| Flag books as lost | ✅ | ✅ |
| Resolve loss reports | ✅ | ❌ |
| Download PDF reports | ✅ | ❌ |
| View all streams | ✅ | ❌ (own stream only) |

---

## 🚢 Deployment

### Option A — Local Network (Single School)

Run everything on one school computer. Teachers connect via school WiFi.

```
Server: Any Windows/Linux/Mac computer
Cost:   KES 0/month
Access: School WiFi only
```

### Option B — Cloud VPS (Multiple Schools)

Deploy on a VPS with Nginx as reverse proxy.

```
Providers: DigitalOcean, Hetzner, Railway
Cost:      KES 600–800/month
Access:    Anywhere with internet
```

```
Internet → Nginx → React (port 80/443)
                 → Spring Boot (port 8080)
                 → MySQL (port 3306, internal only)
```

### Option C — PaaS Free Tier (Testing/Demo)

```
Frontend  → Vercel (free)
Backend   → Railway (free tier)
Database  → Railway MySQL (free tier — 1GB)
```

### SSL Certificate

```bash
# Free SSL with Let's Encrypt (production only)
sudo certbot --nginx -d yourdomain.co.ke
```

---

## 🗺 Roadmap

### ✅ Completed
- [x] Full REST API with JWT security
- [x] React desktop frontend — all 8 pages
- [x] Code 128 barcode generation and printing
- [x] Book distribution with scan support
- [x] Library borrowing with overdue tracking
- [x] Loss reports with PDF download
- [x] Android mobile app — login, students, scan, distributions

### 🔄 In Progress
- [ ] Mobile app polish — logout enforcement, deactivation blocking
- [ ] Barcode scanning reliability improvements

### 📋 Planned
- [ ] Bulk student import from CSV
- [ ] Student profile page with full history
- [ ] Academic year management settings
- [ ] Change password feature
- [ ] Push notifications for overdue borrows
- [ ] Multi-school SaaS support
- [ ] Student transfer history logging
- [ ] Export class lists to Excel/PDF

---

## 🐛 Known Issues

- Stream capacity count does not update dynamically when students are added — workaround: reload the page
- Mobile app stream assignment requires fresh login after assigning teacher to stream in the web app
- Loss reports page pending count in dashboard requires a page refresh after resolving

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/your-feature-name
```

3. Commit your changes

```bash
git commit -m "Add: description of change"
```

4. Push and open a Pull Request

```bash
git push origin feature/your-feature-name
```

---

## 📄 License

This project is proprietary software.
All rights reserved © 2025 Arnold.

---

## 👤 Author

**Arnold**

Built from scratch over several weeks — backend, frontend, and Android mobile app.
Designed specifically for the operational realities of Kenyan secondary school libraries.

- Backend: Java 25 + Spring Boot 3.5.x
- Frontend: React 18
- Mobile: Kotlin + Android
- Database: MySQL 8.0

---

## 🙏 Acknowledgements

- [Spring Boot](https://spring.io/projects/spring-boot) — backend framework
- [ZXing](https://github.com/zxing/zxing) — barcode generation and scanning
- [React](https://react.dev/) — frontend framework
- [ML Kit](https://developers.google.com/ml-kit) — mobile barcode scanning
- [jjwt](https://github.com/jwtk/jjwt) — JWT library
- [Retrofit](https://square.github.io/retrofit/) — Android HTTP client
- [HikariCP](https://github.com/brettwooldridge/HikariCP) — database connection pooling

---

<div align="center">
  <sub>Built with ☕ and determination for Kenyan schools</sub>
</div>
