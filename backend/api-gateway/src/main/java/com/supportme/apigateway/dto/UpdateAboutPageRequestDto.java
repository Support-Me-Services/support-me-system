package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Rich-text HTML from the about-page editor; sanitized server-side before it's stored.")
public record UpdateAboutPageRequestDto(
        @NotNull String aboutContent
) {
}
