package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Organization invitation, returned to the inviting administrator or the invited user.")
public record InvitationResponseDto(
        String id,
        String organizationId,
        @Schema(description = "Only populated when listing the caller's own invitations.")
        String organizationName,
        String invitedUserId,
        InvitationStatusDto status,
        Instant createdAt,
        Instant updatedAt,
        @Schema(description = "Optional note the inviting administrator wrote, shown to the invitee.")
        String message
) {
}
