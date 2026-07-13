package com.arnold.autolibrary.config;
import com.arnold.autolibrary.security.JwtAuthFilter;
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
    private final CustomUserDetailsService customUserDetailsService;

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            CustomUserDetailsService customUserDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.customUserDetailsService = customUserDetailsService;
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
                .authorizeHttpRequests(auth -> auth

                        // OPTIONS must be first and fully open
                        // Browser sends OPTIONS before every real request
                        // If we block OPTIONS, nothing works from React
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Login and registration are public
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/books/copies/{bookId}/qr-image").permitAll()

                        // Librarian only endpoints
                        .requestMatchers("/api/users/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.POST, "/api/books/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.POST, "/api/classes/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.POST, "/api/streams/**")
                        .hasRole("LIBRARIAN")
                        .requestMatchers(HttpMethod.PUT, "/api/losses/**")
                        .hasRole("LIBRARIAN")

                        // Both librarian and teacher
                        .requestMatchers("/api/students/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers("/api/distributions/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers("/api/borrows/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/books/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/losses/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/classes/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")
                        .requestMatchers(HttpMethod.GET, "/api/streams/**")
                        .hasAnyRole("LIBRARIAN", "TEACHER")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                // Step 6 — add JWT filter before Spring's default auth filter
                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
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
                "http://localhost:3000"

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