package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Fields required depend on type: ORG needs name+category, IND needs firstName+lastName.")
public record CreateOrganizationRequestDto(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull OrganizationTypeDto type,

        @Schema(description = "ORG only: the organization's display name.", example = "Acme Foundation")
        String name,

        @Schema(description = "ORG only: category used to build the {category-slug} URL segment.", example = "fundacja")
        String category,

        @Schema(description = "IND only.", example = "Jan")
        String firstName,

        @Schema(description = "IND only.", example = "Kowalski")
        String lastName
) {
}
