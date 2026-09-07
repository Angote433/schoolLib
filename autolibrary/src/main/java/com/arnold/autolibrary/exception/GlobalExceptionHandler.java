package com.arnold.autolibrary.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// Safety net for controller methods that don't wrap their service call in
// a try/catch (several read-only GET endpoints return the service result
// directly). Without this, an AccessDeniedException thrown deep in a
// service would either fall through to Spring Security's generic 403
// handling (fine) or, for NoStreamAssignedException, bubble up as an
// unhandled exception and become a 500 (not fine — never a stack trace,
// never a 500 per the authorization error contract).
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
    }

    @ExceptionHandler(NoStreamAssignedException.class)
    public ResponseEntity<?> handleNoStreamAssigned(NoStreamAssignedException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
    }
}
