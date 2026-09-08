package com.arnold.autolibrary.exception;

// A request is well-formed and the caller is authorized, but the action
// conflicts with a business rule (e.g. "student already has this title",
// "book is not available"). Mapped to 409.
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
