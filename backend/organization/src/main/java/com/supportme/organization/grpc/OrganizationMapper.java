package com.supportme.organization.grpc;

import com.google.protobuf.Timestamp;
import com.supportme.organization.domain.Organization;
import com.supportme.proto.organization.v1.OrganizationStatus;
import com.supportme.proto.organization.v1.OrganizationType;

import java.time.Instant;

/** Translates between JPA domain objects and the generated proto messages. */
final class OrganizationMapper {

    private OrganizationMapper() {
    }

    static com.supportme.proto.organization.v1.Organization toProto(Organization organization) {
        com.supportme.proto.organization.v1.Organization.Builder builder =
                com.supportme.proto.organization.v1.Organization.newBuilder()
                        .setId(organization.getId().toString())
                        .setType(toProtoType(organization.getType()))
                        .setStatus(toProtoStatus(organization.getStatus()))
                        .setName(nullToEmpty(organization.getName()))
                        .setFirstName(nullToEmpty(organization.getFirstName()))
                        .setLastName(nullToEmpty(organization.getLastName()))
                        .setCategory(nullToEmpty(organization.getCategory()))
                        .setCategorySlug(nullToEmpty(organization.getCategorySlug()))
                        .setSlug(nullToEmpty(organization.getSlug()))
                        .setAboutContent(nullToEmpty(organization.getAboutContent()))
                        .setOwnerUserId(organization.getOwnerUserId().toString())
                        .setCreatedAt(toTimestamp(organization.getCreatedAt()))
                        .setUpdatedAt(toTimestamp(organization.getUpdatedAt()));

        if (organization.getDeletionRequestedBy() != null) {
            builder.setDeletionRequestedBy(organization.getDeletionRequestedBy().toString());
        }
        if (organization.getDeletionRequestedAt() != null) {
            builder.setDeletionRequestedAt(toTimestamp(organization.getDeletionRequestedAt()));
        }
        return builder.build();
    }

    static com.supportme.organization.domain.OrganizationType toDomainType(OrganizationType type) {
        return switch (type) {
            case ORGANIZATION_TYPE_IND -> com.supportme.organization.domain.OrganizationType.IND;
            case ORGANIZATION_TYPE_ORG -> com.supportme.organization.domain.OrganizationType.ORG;
            default -> throw new IllegalArgumentException("Unsupported organization type: " + type);
        };
    }

    private static OrganizationType toProtoType(com.supportme.organization.domain.OrganizationType type) {
        return switch (type) {
            case IND -> OrganizationType.ORGANIZATION_TYPE_IND;
            case ORG -> OrganizationType.ORGANIZATION_TYPE_ORG;
        };
    }

    private static OrganizationStatus toProtoStatus(com.supportme.organization.domain.OrganizationStatus status) {
        return switch (status) {
            case ACTIVE -> OrganizationStatus.ORGANIZATION_STATUS_ACTIVE;
            case PENDING_DELETION -> OrganizationStatus.ORGANIZATION_STATUS_PENDING_DELETION;
            case DELETED -> OrganizationStatus.ORGANIZATION_STATUS_DELETED;
        };
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    static Timestamp toTimestamp(Instant instant) {
        return Timestamp.newBuilder()
                .setSeconds(instant.getEpochSecond())
                .setNanos(instant.getNano())
                .build();
    }
}
