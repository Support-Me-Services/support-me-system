package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Organization details returned by the public REST API.")
public record OrganizationResponseDto(
        @Schema(description = "Organization identifier (UUID).", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Organization display name.", example = "Acme Foundation")
        String name,

        @Schema(description = "Organization description.", example = "A charitable foundation supporting local communities.")
        String description,

        @Schema(description = "Creation timestamp (UTC).")
        Instant createdAt
) {
}
