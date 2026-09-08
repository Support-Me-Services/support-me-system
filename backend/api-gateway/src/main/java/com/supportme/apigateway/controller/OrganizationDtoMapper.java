package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.OrganizationResponseDto;
import com.supportme.apigateway.dto.OrganizationStatusDto;
import com.supportme.apigateway.dto.OrganizationTypeDto;
import com.supportme.apigateway.dto.PublicAboutPageResponseDto;
import com.supportme.proto.organization.v1.GetPublicAboutPageResponse;
import com.supportme.proto.organization.v1.Organization;

import java.time.Instant;

/** Translates between the generated proto messages (internal gRPC contract) and the public REST DTOs. */
final class OrganizationDtoMapper {

    private OrganizationDtoMapper() {
    }

    static OrganizationResponseDto toDto(Organization organization) {
        return new OrganizationResponseDto(
                organization.getId(),
                toTypeDto(organization.getType()),
                toStatusDto(organization.getStatus()),
                organization.getName(),
                blankToNull(organization.getFirstName()),
                blankToNull(organization.getLastName()),
                blankToNull(organization.getCategory()),
                blankToNull(organization.getCategorySlug()),
                organization.getSlug(),
                organization.getAboutContent(),
                organization.getOwnerUserId(),
                blankToNull(organization.getDeletionRequestedBy()),
                organization.hasDeletionRequestedAt() ? toInstant(organization.getDeletionRequestedAt()) : null,
                toInstant(organization.getCreatedAt()),
                toInstant(organization.getUpdatedAt()));
    }

    static PublicAboutPageResponseDto toPublicDto(GetPublicAboutPageResponse response) {
        return new PublicAboutPageResponseDto(
                response.getId(),
                toTypeDto(response.getType()),
                response.getName(),
                response.getAboutContent(),
                toInstant(response.getUpdatedAt()));
    }

    static com.supportme.proto.organization.v1.OrganizationType toProtoType(OrganizationTypeDto type) {
        return switch (type) {
            case IND -> com.supportme.proto.organization.v1.OrganizationType.ORGANIZATION_TYPE_IND;
            case ORG -> com.supportme.proto.organization.v1.OrganizationType.ORGANIZATION_TYPE_ORG;
        };
    }

    private static OrganizationTypeDto toTypeDto(com.supportme.proto.organization.v1.OrganizationType type) {
        return switch (type) {
            case ORGANIZATION_TYPE_IND -> OrganizationTypeDto.IND;
            case ORGANIZATION_TYPE_ORG -> OrganizationTypeDto.ORG;
            default -> throw new IllegalStateException("organization service returned an unspecified type");
        };
    }

    private static OrganizationStatusDto toStatusDto(com.supportme.proto.organization.v1.OrganizationStatus status) {
        return switch (status) {
            case ORGANIZATION_STATUS_ACTIVE -> OrganizationStatusDto.ACTIVE;
            case ORGANIZATION_STATUS_PENDING_DELETION -> OrganizationStatusDto.PENDING_DELETION;
            case ORGANIZATION_STATUS_DELETED -> OrganizationStatusDto.DELETED;
            default -> throw new IllegalStateException("organization service returned an unspecified status");
        };
    }

    private static Instant toInstant(com.google.protobuf.Timestamp timestamp) {
        return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
