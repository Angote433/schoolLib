package com.arnold.autolibrary.config;
import com.arnold.autolibrary.security.CustomAccessDeniedHandler;
import com.arnold.autolibrary.security.CustomAuthenticationEntryPoint;
import com.arnold.autolibrary.security.JwtAuthFilter;
import com.arnold.autolibrary.security.RequestLoggingFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RequestLoggingFilter requestLoggingFilter;
    private final CustomUserDetailsService customUserDetailsService;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final CustomAuthenticationEntryPoint authenticationEntryPoint;

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            RequestLoggingFilter requestLoggingFilter,
            CustomUserDetailsService customUserDetailsService,
            CustomAccessDeniedHandler accessDeniedHandler,
            CustomAuthenticationEntryPoint authenticationEntryPoint) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.requestLoggingFilter = requestLoggingFilter;
        this.customUserDetailsService = customUserDetailsService;
        this.accessDeniedHandler = accessDeniedHandler;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http)
            throws Exception {

        http
                // Step 1 — disable CSRF (not needed for REST APIs)
                .csrf(csrf -> csrf.disable())

                // Step 2 — attach our CORS config
                .cors(cors -> cors
                        .configurationSource(corsConfigurationSource())
                )

                // Step 3 — no sessions, every request must carry token
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // Step 4 — use our database for authentication
                .authenticationProvider(authenticationProvider())

                // Step 5 — define who can access what
                //
                // This is layer one of two. Route rules here stop a
                // request before it reaches a controller at all — they
                // express *role*. They cannot express "your own stream
                // only", so any endpoint a TEACHER may call but only for
                // their own stream's data is scoped a second time, at
                // the data level, inside the service (see AuthUtil).
                // Order matters: Spring Security uses first-match-wins,
                // so a more specific rule must be declared before a
                // broader one that would otherwise also match it.
                .authorizeHttpRequests(auth -> auth

                        // OPTIONS must be first and fully open
                        // Browser sends OPTIONS before every real request
                        // If we block OPTIONS, nothing works from React
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Login and registration are public
                        .requestMatchers("/api/auth/**").permitAll()

                        // A user may always read and self-service-edit
                        // their own profile/password — must come before
                        // the blanket /api/users/** rule below.
                        .requestMatchers(HttpMethod.GET, "/api/users/me")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.PUT, "/api/users/me", "/api/users/me/password")
                        .hasAnyRole("LIBRARIAN", "TEACHER")

                        // Librarian only endpoints
                        .requestMatchers("/api/users/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers("/api/classes/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.POST, "/api/streams/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.PUT, "/api/streams/**")
                        .hasRole("LIBRARIAN")
                        // Unassigning a stream's teacher — Feature 3 —
                        // must come before the general GET rule below so
                        // it isn't left to fall through to anyRequest().
                        .requestMatchers(HttpMethod.DELETE, "/api/streams/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.GET, "/api/streams")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.GET, "/api/streams/class/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.POST, "/api/books/**")
                        .hasRole("LIBRARIAN")
                        // Sticker/QR printing is a librarian desk task —
                        // must come before the general GET /api/books/** rule.
                        .requestMatchers(HttpMethod.GET, "/api/books/copies/*/qr-image")
                        .hasRole("LIBRARIAN")
                        // Library borrowing (short-term desk borrowing) is
                        // a librarian-only function, not a teacher one.
                        .requestMatchers("/api/borrows/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.PUT, "/api/losses/**")
                        .hasRole("LIBRARIAN")
                        // Moving a student between streams is a librarian
                        // decision — must come before the general
                        // /api/students/** rule below.
                        .requestMatchers(HttpMethod.PUT, "/api/students/*/transfer")
                        .hasRole("LIBRARIAN")

                        // Both librarian and teacher — scoped to the
                        // caller's own stream at the data level for TEACHER
                        .requestMatchers("/api/students/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers("/api/distributions/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/books/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/losses/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        // Single-stream lookup — a teacher may read only
                        // their own (enforced in StreamService).
                        .requestMatchers(HttpMethod.GET, "/api/streams/*")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        // Who currently teaches a stream — same
                        // own-stream-only scoping for a TEACHER caller.
                        .requestMatchers(HttpMethod.GET, "/api/streams/*/teacher")
                        .hasAnyRole("LIBRARIAN", "TEACHER")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                // Step 6 — add JWT filter before Spring's default auth filter,
                // and the request-logging filter before that so it wraps the
                // whole chain (see RequestLoggingFilter for why).
                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .addFilterBefore(
                        requestLoggingFilter,
                        JwtAuthFilter.class
                )

                // Step 7 — route-level denials (hasRole mismatch, no/bad
                // token) happen inside this filter chain, before any
                // controller — without this they'd bypass
                // GlobalExceptionHandler entirely and return Spring's bare
                // default response with no logging.
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler(accessDeniedHandler)
                        .authenticationEntryPoint(authenticationEntryPoint)
                );

        return http.build();
    }

    // CORS configuration
    // This tells Spring Boot which origins, methods, and headers to allow
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allow requests from React development server
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://192.168.100.32:3000"

        ));

        // Allow all HTTP methods
        config.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
        );

        // Allow all headers — including Authorization which carries the token
        config.setAllowedHeaders(List.of("*"));

        // Allow credentials — needed for some auth flows
        config.setAllowCredentials(true);

        // How long browser caches preflight response — 1 hour
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        // Apply to all endpoints
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}