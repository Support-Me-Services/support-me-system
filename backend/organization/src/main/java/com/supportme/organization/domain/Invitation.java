package com.supportme.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Invitation to join an ORG organization as a member (SCRUM-188/SCRUM-189). */
@Entity
@Table(name = "invitation")
public class Invitation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "invited_user_id", nullable = false, updatable = false)
    private UUID invitedUserId;

    /** Audit only - see Invitation proto message's doc comment. */
    @Column(name = "invited_by_user_id", nullable = false, updatable = false)
    private UUID invitedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvitationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Invitation() {
        // JPA
    }

    public static Invitation create(UUID id, UUID organizationId, UUID invitedUserId, UUID invitedByUserId,
                                     Instant now) {
        Invitation invitation = new Invitation();
        invitation.id = id;
        invitation.organizationId = organizationId;
        invitation.invitedUserId = invitedUserId;
        invitation.invitedByUserId = invitedByUserId;
        invitation.status = InvitationStatus.PENDING;
        invitation.createdAt = now;
        invitation.updatedAt = now;
        return invitation;
    }

    public boolean isPending() {
        return status == InvitationStatus.PENDING;
    }

    public void accept(Instant now) {
        this.status = InvitationStatus.ACCEPTED;
        this.updatedAt = now;
    }

    public void decline(Instant now) {
        this.status = InvitationStatus.DECLINED;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getInvitedUserId() {
        return invitedUserId;
    }

    public UUID getInvitedByUserId() {
        return invitedByUserId;
    }

    public InvitationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
