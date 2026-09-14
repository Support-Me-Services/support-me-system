package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.InvitationResponseDto;
import com.supportme.apigateway.dto.InvitationStatusDto;
import com.supportme.proto.organization.v1.Invitation;
import com.supportme.proto.organization.v1.InvitationStatus;

import java.time.Instant;

/** Translates between the generated proto messages and the public REST DTOs. */
final class InvitationDtoMapper {

    private InvitationDtoMapper() {
    }

    static InvitationResponseDto toDto(Invitation invitation) {
        return new InvitationResponseDto(
                invitation.getId(),
                invitation.getOrganizationId(),
                blankToNull(invitation.getOrganizationName()),
                invitation.getInvitedUserId(),
                toStatusDto(invitation.getStatus()),
                toInstant(invitation.getCreatedAt()),
                toInstant(invitation.getUpdatedAt()),
                blankToNull(invitation.getMessage()));
    }

    private static InvitationStatusDto toStatusDto(InvitationStatus status) {
        return switch (status) {
            case INVITATION_STATUS_PENDING -> InvitationStatusDto.PENDING;
            case INVITATION_STATUS_ACCEPTED -> InvitationStatusDto.ACCEPTED;
            case INVITATION_STATUS_DECLINED -> InvitationStatusDto.DECLINED;
            default -> throw new IllegalStateException("organization service returned an unspecified invitation status");
        };
    }

    private static Instant toInstant(com.google.protobuf.Timestamp timestamp) {
        return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
