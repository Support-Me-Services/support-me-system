package com.supportme.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** ORG-only membership/role row. IND organizations don't use this table - see Organization.ownerUserId. */
@Entity
@Table(name = "organization_membership")
public class OrganizationMembership {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private MembershipRole role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OrganizationMembership() {
        // JPA
    }

    public OrganizationMembership(UUID id, UUID organizationId, UUID userId, MembershipRole role, Instant createdAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.userId = userId;
        this.role = role;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getUserId() {
        return userId;
    }

    public MembershipRole getRole() {
        return role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
