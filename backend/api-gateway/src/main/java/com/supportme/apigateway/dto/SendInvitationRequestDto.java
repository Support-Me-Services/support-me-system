package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Invites the given user (id obtained via GET /api/v1/users/search) to this organization.")
public record SendInvitationRequestDto(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String invitedUserId,
        @Schema(description = "Optional note shown to the invitee.")
        @Size(max = 1000) String message
) {
}
