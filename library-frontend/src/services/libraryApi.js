import api from './api';

// ── AUTH ──────────────────────────────────────────────
export const authService = {
  login: (data) => api.post('/auth/login', data),
  registerLibrarian: (data) =>
    api.post('/auth/register-librarian', data),
};

// ── CLASSES ───────────────────────────────────────────
export const classService = {
  getAll: () => api.get('/classes'),
  create: (data) => api.post('/classes', data),
};

//STREAMS
export const streamService = {
  getAll: () => api.get('/streams'),
  getByClass: (classId) => api.get(`/streams/class/${classId}`),
  create: (data, classId) =>
    api.post(`/streams?classId=${classId}`, data),
  assignTeacher: (streamId, userId) =>
    api.put(`/streams/${streamId}/teacher?userId=${userId}`),
};

// ── USERS ─────────────────────────────────────────────
export const userService = {
  getAll: () => api.get('/users'),
  getByRole: (role) => api.get(`/users/role/${role}`),
  create: (data) => api.post('/users', data),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
  activate: (id) => api.put(`/users/${id}/activate`),
  assignStream: (id, streamId) =>
    api.put(`/users/${id}/stream?streamId=${streamId}`),
};

// ── STUDENTS ──────────────────────────────────────────
export const studentService = {
  getAll: () => api.get('/students'),
  getByStream: (streamId) =>
    api.get(`/students/stream/${streamId}`),

  getByAdmission: (admNo) =>
    api.get(`/students/admission/${admNo}`),
  create: (data, streamId) =>
    api.post(`/students?streamId=${streamId}`, data),
  update: (id, data) => api.put(`/students/${id}`, data),
  deactivate: (id) => api.put(`/students/${id}/deactivate`),
  activate: (id) => api.put(`/students/${id}/activate`),
  checkExists: (admNo) =>
    api.get(`/students/exists/${admNo}`),
};

// ── BOOKS ─────────────────────────────────────────────
export const bookService = {
  getAll: () => api.get('/books'),
  getById: (id) => api.get(`/books/${id}`),
  getByGrade: (grade) => api.get(`/books/grade/${grade}`),
  create: (data) => api.post('/books', data),
  getCopies: (bookId) => api.get(`/books/copies/${bookId}`),
  getAvailableCopies: (bookId) =>
    api.get(`/books/copies/${bookId}/available`),
  registerCopies: (id, quantity, dateAcquired) =>
    api.post(
      `/books/${id}/copies?quantity=${quantity}&dateAcquired=${dateAcquired}`
    ),
  scanByQr: (qrCode) => api.get(`/books/scan/${encodeURIComponent(qrCode)}`),
  // QR image URL — used directly in <img src={...} />
  getQrImageUrl: (copyId) =>
    `${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/books/copies/${copyId}/qr-image`,
  getByIsbn: (isbn) =>
    api.get(`/books/isbn/${isbn}`),
  getByAccession: (accessionNumber) =>
    api.get(`/books/accession/${encodeURIComponent(accessionNumber)}`),
};

// ── DISTRIBUTIONS ─────────────────────────────────────
export const distributionService = {
  distribute: (data) => api.post('/distributions', data),
  returnBook: (qrCode) =>
    api.put(`/distributions/return/${encodeURIComponent(qrCode)}`),
  flagLost: (data) => api.post('/distributions/loss', data),
  getByStudent: (studentId) =>
    api.get(`/distributions/student/${studentId}`),
  getByYear: (year) => api.get(`/distributions/year/${year}`),
  getByStreamAndYear: (streamId, year) =>
    api.get(`/distributions/stream/${streamId}/year/${year}`),
  getActiveByIsbnAndStream: (isbn, streamId) =>
    api.get(`/distributions/isbn/${encodeURIComponent(isbn)}/stream/${streamId}`),
  distributeByAccession: (data) =>
    api.post('/distributions/by-accession', data),
};

// ── BORROWS ───────────────────────────────────────────
export const borrowService = {
  borrow: (data) => api.post('/borrows', data),
  returnBook: (qrCode) =>
    api.put(`/borrows/return/${encodeURIComponent(qrCode)}`),
  getActive: () => api.get('/borrows/active'),
  getOverdue: () => api.get('/borrows/overdue'),
  getByStudent: (studentId) =>
    api.get(`/borrows/student/${studentId}`),
  flagLost: (data) => api.post('/borrows/loss', data),
};

// ── LOSS REPORTS ──────────────────────────────────────
export const lossService = {
  getAll: () => api.get('/losses'),
  getPending: () => api.get('/losses/pending'),
  getById: (id) => api.get(`/losses/${id}`),
  getByStudent: (studentId) =>
    api.get(`/losses/student/${studentId}`),
  getBySource: (source) =>
    api.get(`/losses/source/${source}`),
  resolve: (id, notes) =>
    api.put(`/losses/${id}/resolve`, { notes }),
  writeOff: (id, notes) =>
    api.put(`/losses/${id}/writeoff`, { notes }),
};