package com.arnold.autolibrary.exception;

// Thrown when a TEACHER calls a stream-scoped endpoint but has no stream
// assigned yet. Mapped to 409 Conflict — never an empty list — so the
// teacher's client can show "contact your librarian" instead of a
// misleading "no students/records" state.
public class NoStreamAssignedException extends RuntimeException {
    public NoStreamAssignedException(String message) {
        super(message);
    }
}
