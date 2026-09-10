package com.supportme.apigateway.keycloak;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Minimal slice of Keycloak's UserRepresentation JSON - the rest of its ~30 fields are ignored. */
@JsonIgnoreProperties(ignoreUnknown = true)
record KeycloakUserRepresentation(String id, String username, String email, String firstName, String lastName) {
}
