package com.supportme.organization.grpc;

import com.supportme.organization.domain.Invitation;
import com.supportme.proto.organization.v1.InvitationStatus;

/** Translates between JPA domain objects and the generated proto messages. */
final class InvitationMapper {

    private InvitationMapper() {
    }

    /** organizationName is only populated by ListMyInvitations - pass "" elsewhere, see invitation.proto. */
    static com.supportme.proto.organization.v1.Invitation toProto(Invitation invitation, String organizationName) {
        return com.supportme.proto.organization.v1.Invitation.newBuilder()
                .setId(invitation.getId().toString())
                .setOrganizationId(invitation.getOrganizationId().toString())
                .setOrganizationName(organizationName == null ? "" : organizationName)
                .setInvitedUserId(invitation.getInvitedUserId().toString())
                .setInvitedByUserId(invitation.getInvitedByUserId().toString())
                .setStatus(toProtoStatus(invitation.getStatus()))
                .setCreatedAt(OrganizationMapper.toTimestamp(invitation.getCreatedAt()))
                .setUpdatedAt(OrganizationMapper.toTimestamp(invitation.getUpdatedAt()))
                .build();
    }

    private static InvitationStatus toProtoStatus(com.supportme.organization.domain.InvitationStatus status) {
        return switch (status) {
            case PENDING -> InvitationStatus.INVITATION_STATUS_PENDING;
            case ACCEPTED -> InvitationStatus.INVITATION_STATUS_ACCEPTED;
            case DECLINED -> InvitationStatus.INVITATION_STATUS_DECLINED;
        };
    }
}
