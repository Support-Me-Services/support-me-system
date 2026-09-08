package com.supportme.organization.domain;

public enum OrganizationStatus {
    ACTIVE,
    /** ORG only - an administrator has requested deletion; awaiting Super Administrator approval. */
    PENDING_DELETION,
    /** Soft-deleted. Kept (not hard-deleted) for audit history; its slug stays reserved. */
    DELETED
}
