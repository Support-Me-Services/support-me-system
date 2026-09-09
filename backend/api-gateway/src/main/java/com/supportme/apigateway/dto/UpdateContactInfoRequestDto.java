package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Organization contact info (\"Informacja kontaktowa\" panel) and, from \"Zarządzanie kontem\", "
        + "the display name too. ORG sends name; IND sends firstName/lastName - whichever doesn't apply to the "
        + "organization's type is ignored server-side.")
public record UpdateContactInfoRequestDto(
        String name,
        String firstName,
        String lastName,
        String phoneNumber,
        @Schema(description = "e.g. Proboszcz, Wikariusz, Kapelan, Diakon.")
        String role
) {
}
