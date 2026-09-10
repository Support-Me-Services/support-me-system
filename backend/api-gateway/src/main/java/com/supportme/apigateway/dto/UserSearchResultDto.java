package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Minimal public identity of a Keycloak-managed user, for the invite-search flow.")
public record UserSearchResultDto(
        String id,
        String email,
        String name
) {
}
