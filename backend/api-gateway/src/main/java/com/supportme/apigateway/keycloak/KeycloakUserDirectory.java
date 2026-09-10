package com.supportme.apigateway.keycloak;

import com.supportme.apigateway.dto.UserSearchResultDto;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Searches Keycloak's Admin REST API for users, to back the "invite a user" flow (SCRUM-188).
 * This is genuinely new infrastructure: no backend service owns user identity today (it's 100%
 * Keycloak-managed, see organization.proto's authorization-split comment) and nothing here
 * previously called the Admin API.
 *
 * Local dev authenticates as the Keycloak bootstrap admin (KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD
 * from docker-compose.yml, master realm, built-in "admin-cli" public client, resource-owner
 * password grant) - see KeycloakAdminProperties. Replace this with a dedicated confidential
 * client + service account (client_credentials grant, "realm-management" -> "query-users" role,
 * scoped to the support-me realm only) before running in any shared or production environment.
 */
@Service
public class KeycloakUserDirectory {

    private static final int MAX_RESULTS = 20;

    private final RestClient restClient;
    private final KeycloakAdminProperties properties;

    public KeycloakUserDirectory(KeycloakAdminProperties properties) {
        this.restClient = RestClient.builder().baseUrl(properties.baseUrl()).build();
        this.properties = properties;
    }

    public List<UserSearchResultDto> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String accessToken = fetchAdminAccessToken();
        KeycloakUserRepresentation[] users = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/admin/realms/{realm}/users")
                        .queryParam("search", query)
                        .queryParam("max", MAX_RESULTS)
                        .build(properties.realm()))
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(KeycloakUserRepresentation[].class);

        return users == null ? List.of() : Arrays.stream(users)
                .filter(user -> user.email() != null && !user.email().isBlank())
                .map(user -> new UserSearchResultDto(user.id(), user.email(), displayName(user)))
                .toList();
    }

    private static String displayName(KeycloakUserRepresentation user) {
        String first = user.firstName() == null ? "" : user.firstName();
        String last = user.lastName() == null ? "" : user.lastName();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? user.username() : full;
    }

    // TODO: cache the admin token until shortly before it expires instead of fetching a fresh
    // one per search call - acceptable for now given this is a low-QPS, debounced admin feature.
    private String fetchAdminAccessToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", properties.adminClientId());
        form.add("username", properties.adminUsername());
        form.add("password", properties.adminPassword());

        Map<String, Object> tokenResponse = restClient.post()
                .uri("/realms/{realm}/protocol/openid-connect/token", properties.adminRealm())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });

        Object accessToken = tokenResponse == null ? null : tokenResponse.get("access_token");
        if (accessToken == null) {
            throw new IllegalStateException("Keycloak admin token response did not contain access_token");
        }
        return accessToken.toString();
    }
}
