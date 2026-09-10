package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.UserSearchResultDto;
import com.supportme.apigateway.keycloak.KeycloakUserDirectory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Authenticated user directory search (SCRUM-188), backing the "invite a user" flow. Delegates
 * to Keycloak's Admin REST API - see KeycloakUserDirectory's class doc.
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Authenticated user directory search, backed by Keycloak.")
public class UserController {

    private final KeycloakUserDirectory keycloakUserDirectory;

    public UserController(KeycloakUserDirectory keycloakUserDirectory) {
        this.keycloakUserDirectory = keycloakUserDirectory;
    }

    @Operation(summary = "Search users",
            description = "Searches Keycloak-managed users by email or name substring, to invite them to an organization you administer.")
    @GetMapping("/search")
    public List<UserSearchResultDto> search(@RequestParam String query) {
        return keycloakUserDirectory.search(query);
    }
}
