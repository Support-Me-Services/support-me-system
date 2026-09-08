package com.supportme.apigateway.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmDeletionRequestDto(
        @NotBlank String confirmationToken
) {
}
