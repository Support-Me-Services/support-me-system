package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Guest-facing (no auth) view of an organization's public 'about' page.")
public record PublicAboutPageResponseDto(
        String id,
        OrganizationTypeDto type,
        String name,
        String aboutContent,
        Instant updatedAt
) {
}
