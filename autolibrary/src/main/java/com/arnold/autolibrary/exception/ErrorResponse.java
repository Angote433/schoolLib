package com.arnold.autolibrary.exception;

import org.slf4j.MDC;

import java.time.Instant;

// The single response body shape returned to the client for every error,
// success bodies are untouched. requestId lets an operator find the full
// detail (including stack trace, for 5xx) in the server log without ever
// exposing that detail to the client.
public class ErrorResponse {
    private final String timestamp;
    private final int status;
    private final String message;
    private final String requestId;

    public ErrorResponse(int status, String message) {
        this.timestamp = Instant.now().toString();
        this.status = status;
        this.message = message;
        this.requestId = MDC.get("requestId");
    }

    public String getTimestamp() { return timestamp; }
    public int getStatus() { return status; }
    public String getMessage() { return message; }
    public String getRequestId() { return requestId; }
}
