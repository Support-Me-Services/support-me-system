package com.supportme.apigateway.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "IND: individual organization tied to one user. ORG: company/group organization.")
public enum OrganizationTypeDto {
    IND,
    ORG
}
