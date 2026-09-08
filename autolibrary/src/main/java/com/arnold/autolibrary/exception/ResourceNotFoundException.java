package com.arnold.autolibrary.exception;

// Thrown when a lookup by id/code finds nothing. Mapped to 404.
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
