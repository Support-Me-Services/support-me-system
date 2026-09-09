package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Organization details, returned only to an authenticated actor who owns or administers it.")
public record OrganizationResponseDto(
        String id,
        OrganizationTypeDto type,
        OrganizationStatusDto status,
        String name,
        String firstName,
        String lastName,
        String category,
        String categorySlug,
        @Schema(description = "The {nazwisko-imie} or {name-slug} URL path segment.")
        String slug,
        String aboutContent,
        String phoneNumber,
        @Schema(description = "Church role shown on the \"Wizytówka\" page (e.g. Proboszcz, Wikariusz, Kapelan, Diakon).")
        String role,
        String ownerUserId,
        String deletionRequestedBy,
        Instant deletionRequestedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
