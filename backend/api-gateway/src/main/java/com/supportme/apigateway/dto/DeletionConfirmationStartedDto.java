package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Step 1 of the IND double-confirmation deletion flow: echo confirmationToken back to step 2 before it expires.")
public record DeletionConfirmationStartedDto(
        String confirmationToken,
        Instant expiresAt
) {
}
