package com.arnold.autolibrary.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// Single place every exception thrown anywhere in a controller call
// (services included) is translated into an HTTP response. This is what
// lets every controller stay free of try/catch — a service throws the
// exception that best expresses what went wrong, and it lands here as
// the correct status with a consistent JSON body:
// { timestamp, status, message, requestId }
//
// 4xx = an expected client-side condition -> WARN, no stack trace.
// 5xx = a real fault -> ERROR, full stack trace (server log only).
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException e, HttpServletRequest req) {
        log.warn("Not found: {} {} -> {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return build(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(NoStreamAssignedException.class)
    public ResponseEntity<ErrorResponse> handleNoStreamAssigned(NoStreamAssignedException e) {
        log.warn("No stream assigned: user={}", MDC.get("user"));
        return build(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(BusinessRuleException e) {
        log.warn("Business rule violation: {}", e.getMessage());
        return build(HttpStatus.CONFLICT, e.getMessage());
    }

    // Covers StreamAccessException too (it extends AccessDeniedException) —
    // a clear audit-trail WARN every time a request is denied, whether it's
    // a teacher acting outside their stream or any other access check.
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e, HttpServletRequest req) {
        log.warn("Access denied: user={} attempted={} method={} reason={}",
                MDC.get("user"), req.getRequestURI(), req.getMethod(), e.getMessage());
        return build(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException e) {
        log.warn("Bad credentials: {}", e.getMessage());
        return build(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("Invalid request: {}", e.getMessage());
        return build(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException e) {
        log.warn("Business rule violation: {}", e.getMessage());
        return build(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException e) {
        log.error("Data integrity violation", e);
        return build(HttpStatus.CONFLICT, "This action conflicts with existing data.");
    }

    // Safety net for a bare RuntimeException that hasn't been migrated to
    // one of the specific types above — preserves the previous default of
    // 400 rather than letting it fall through to the 500 handler.
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntime(RuntimeException e) {
        log.warn("Request rejected: {}", e.getMessage());
        return build(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    // True catch-all — anything reaching here is an unexpected fault, not
    // a condition the code anticipated. Full stack trace server-side only;
    // the client gets a generic message plus the requestId to quote back.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e, HttpServletRequest req) {
        log.error("Unhandled exception on {} {}", req.getMethod(), req.getRequestURI(), e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again or contact support.");
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(status.value(), message));
    }
}
