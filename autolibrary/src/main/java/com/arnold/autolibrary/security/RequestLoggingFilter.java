package com.arnold.autolibrary.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

// Wraps every request in a short correlation id so every log line it
// produces — across the JWT filter, services, and the exception handler —
// can be tied back together by grepping one [requestId]. Registered as
// the first filter in the security chain (see SecurityConfig) so it wraps
// JwtAuthFilter and everything downstream, letting it read the resolved
// username after authentication for the completion line.
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (shouldSkip(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String requestId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("requestId", requestId);
        MDC.put("user", "anonymous");

        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            String user = resolveUser();
            MDC.put("user", user);
            long durationMs = System.currentTimeMillis() - start;
            log.info("{} {} -> {} ({}ms) user={}",
                    request.getMethod(), path, response.getStatus(), durationMs, user);
            // Clear so values never leak onto an unrelated request on a
            // reused container thread.
            MDC.clear();
        }
    }

    private String resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // Spring Security's AnonymousAuthenticationToken reports
        // isAuthenticated()=true with principal "anonymousUser" — treat
        // it the same as no authentication at all for logging purposes.
        if (auth != null && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken)
                && auth.getName() != null) {
            return auth.getName();
        }
        return "anonymous";
    }

    private boolean shouldSkip(String path) {
        return path.startsWith("/actuator") || path.startsWith("/static") || path.equals("/favicon.ico");
    }
}
