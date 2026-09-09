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
  getById: (id) => api.get(`/streams/${id}`),
  getByClass: (classId) => api.get(`/streams/class/${classId}`),
  create: (data, classId) =>
    api.post(`/streams?classId=${classId}`, data),
  assignTeacher: (streamId, userId, confirm = false) =>
    api.put(`/streams/${streamId}/teacher`, { userId, confirm }),
  removeTeacher: (streamId) =>
    api.delete(`/streams/${streamId}/teacher`),
  getTeacher: (streamId) =>
    api.get(`/streams/${streamId}/teacher`),
};

// ── USERS ─────────────────────────────────────────────
export const userService = {
  getAll: () => api.get('/users'),
  getMe: () => api.get('/users/me'),
  getByRole: (role) => api.get(`/users/role/${role}`),
  create: (data) => api.post('/users', data),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
  activate: (id) => api.put(`/users/${id}/activate`),
  assignStream: (id, streamId) =>
    api.put(`/users/${id}/stream?streamId=${streamId}`),
  updateProfile: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/password', data),
  resetPassword: (id, newPassword) =>
    api.put(`/users/${id}/reset-password`, { newPassword }),
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
  // Librarian only — moves a student to a different stream
  transfer: (id, streamId) =>
    api.put(`/students/${id}/transfer?streamId=${streamId}`),
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
  previewCopies: (id, request) =>
    api.post(`/books/${id}/copies/preview`, request),
  registerCopies: (id, request) =>
    api.post(`/books/${id}/copies`, request),
  // qrCode/accessionNumber go as a query param, not a path segment — a
  // hand-written accession number (Feature 1, Modes B/C) may contain a
  // "/" (e.g. "LIB/2019/045"), which the servlet container rejects as an
  // encoded slash in a path segment.
  scanByQr: (qrCode) => api.get('/books/scan', { params: { code: qrCode } }),
  // QR image URL — used directly in <img src={...} />
  getQrImageUrl: (copyId) =>
    `${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/books/copies/${copyId}/qr-image`,
  getByIsbn: (isbn) =>
    api.get(`/books/isbn/${isbn}`),
  getByAccession: (accessionNumber) =>
    api.get('/books/accession', { params: { number: accessionNumber } }),
};

// ── DISTRIBUTIONS ─────────────────────────────────────
export const distributionService = {
  distribute: (data) => api.post('/distributions', data),
  returnBook: (qrCode) =>
    api.put('/distributions/return', null, { params: { qrCode } }),
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
    api.put('/borrows/return', null, { params: { qrCode } }),
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