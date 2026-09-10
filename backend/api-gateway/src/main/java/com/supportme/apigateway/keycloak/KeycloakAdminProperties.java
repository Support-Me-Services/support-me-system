package com.supportme.apigateway.keycloak;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externalized config for the Keycloak Admin API client (SCRUM-188 user search) - mirrors the
 * env-var-overridable style used for the OAuth2 resource server / gRPC channel properties in
 * application.yml. See KeycloakUserDirectory's class doc for the local-dev-only caveat on the
 * default admin/admin credentials.
 */
@ConfigurationProperties(prefix = "app.keycloak-admin")
public record KeycloakAdminProperties(
        String baseUrl,
        String realm,
        String adminRealm,
        String adminClientId,
        String adminUsername,
        String adminPassword
) {
}
