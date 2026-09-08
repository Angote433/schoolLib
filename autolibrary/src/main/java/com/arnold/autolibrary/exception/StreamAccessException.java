package com.arnold.autolibrary.exception;

import org.springframework.security.access.AccessDeniedException;

// A teacher attempted to act outside their own stream. Extends Spring
// Security's AccessDeniedException so it is still caught by anything
// that already handles that type, while letting the exception handler
// log this specific case distinctly (audit trail for stream-scoping
// violations). Mapped to 403.
public class StreamAccessException extends AccessDeniedException {
    public StreamAccessException(String message) {
        super(message);
    }
}
