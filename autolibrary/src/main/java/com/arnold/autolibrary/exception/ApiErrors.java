package com.arnold.autolibrary.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

// Central place to translate a caught RuntimeException into the right
// HTTP status. Every controller already wraps its service calls in
// try/catch(RuntimeException) — this keeps that single catch block
// correct instead of needing a separate catch clause per controller
// method for every authorization exception type.
public class ApiErrors {

    private ApiErrors() {}

    public static ResponseEntity<?> toResponse(RuntimeException e) {
        return toResponse(e, HttpStatus.BAD_REQUEST);
    }

    public static ResponseEntity<?> toResponse(RuntimeException e, HttpStatus fallback) {
        if (e instanceof AccessDeniedException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
        if (e instanceof NoStreamAssignedException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
        return ResponseEntity.status(fallback).body(e.getMessage());
    }
}
