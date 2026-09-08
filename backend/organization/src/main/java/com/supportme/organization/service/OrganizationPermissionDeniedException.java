package com.supportme.organization.service;

import java.util.UUID;

/** Thrown when the actor is authenticated but has no relationship to the resource that grants the attempted action. */
public class OrganizationPermissionDeniedException extends RuntimeException {
    public OrganizationPermissionDeniedException(UUID actorUserId, UUID organizationId, String action) {
        super("User " + actorUserId + " may not " + action + " organization " + organizationId);
    }
}
