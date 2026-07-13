package com.arnold.autolibrary.security;

import com.arnold.autolibrary.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        System.out.println("AUTH HEADER: " + authHeader);



        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        System.out.println("TOKEN: " + token.substring(0, 20) + "...");

        try {
            String username = jwtUtil.extractUserName(token);
            System.out.println("EXTRACTED USERNAME: " + username);

            // Only set authentication if:
            // 1. Username was extracted successfully
            // 2. No authentication already set in this request
            // 3.
            if (username != null &&
                    SecurityContextHolder.getContext()
                            .getAuthentication() == null &&
                    !jwtUtil.isTokenExpired(token)) {

                String role = jwtUtil.extractRole(token);
                System.out.println("ROLE: " + role);

                // Create authentication object
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,

                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );


                SecurityContextHolder.getContext()
                        .setAuthentication(authToken);

                System.out.println("AUTHENTICATION SET FOR: " + username
                        + " with role ROLE_" + role);
            } else {
                System.out.println("AUTH NOT SET — username: " + username
                        + " expired: " + jwtUtil.isTokenExpired(token));
            }

        } catch (Exception e) {
            System.out.println("JWT FILTER ERROR: " + e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}