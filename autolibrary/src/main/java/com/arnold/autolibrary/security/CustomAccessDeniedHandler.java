package com.arnold.autolibrary.security;

import com.arnold.autolibrary.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

// Route-level denials (a request that fails a hasRole/hasAnyRole rule in
// SecurityConfig) never reach a controller, so GlobalExceptionHandler
// never sees them — Spring Security's ExceptionTranslationFilter handles
// them itself. Without this, that path returns Spring's bare default 403
// with no logging and no consistent body. This is what makes "a teacher
// hitting a librarian-only endpoint" produce the same WARN + JSON shape
// as a service-level denial.
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private static final Logger log = LoggerFactory.getLogger(CustomAccessDeniedHandler.class);

    private final ObjectMapper objectMapper;

    public CustomAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                        AccessDeniedException e) throws IOException {
        log.warn("Access denied: user={} attempted={} method={} reason={}",
                MDC.get("user"), request.getRequestURI(), request.getMethod(), e.getMessage());

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = new ErrorResponse(HttpStatus.FORBIDDEN.value(),
                "You do not have permission to perform this action.");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
