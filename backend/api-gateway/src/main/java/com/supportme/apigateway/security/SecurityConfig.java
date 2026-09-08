package com.supportme.apigateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * api-gateway is the sole authentication boundary (validates Keycloak-issued JWTs) and the
 * place where coarse-grained, role-based authorization happens: the global Super Administrator
 * role, which doesn't depend on any specific resource, is checked here from the token alone.
 * Resource-level checks (is this actor the IND owner? an ORG administrator?) are NOT
 * duplicated here - they're delegated to the organization service, which owns that data. See
 * organization.proto's service-level doc comment for the full rationale (SCRUM-183).
 */
@Configuration
public class SecurityConfig {

    // The browser-facing frontend (apps/web) runs on a different origin than api-gateway
    // (localhost:3000 vs localhost:8080 in local dev), so every request carrying an
    // Authorization header triggers a CORS preflight (OPTIONS) first - without a CORS policy,
    // Spring Security rejects that preflight with 401 before the real request is ever sent,
    // which surfaces in the browser as a generic network failure, not as a 401 on the actual
    // endpoint (confirmed by a real failure: every fetch from the frontend failed even though
    // the same request worked fine from curl/server-to-server, which never triggers preflight).
    @Value("${app.cors.allowed-origins:http://localhost:3000,https://please-support-me.com}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Stateless bearer-token REST API - no browser session/cookie to forge against.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/api/v1/public/**",
                                "/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
                                "/actuator/health", "/actuator/info")
                        .permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("SUPER_ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList();

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRoleConverter());
        return converter;
    }
}
