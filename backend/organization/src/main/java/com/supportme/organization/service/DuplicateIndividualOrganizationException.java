package com.supportme.organization.service;

import java.util.UUID;

/** Thrown when a user who already owns a non-deleted IND organization tries to create another. */
public class DuplicateIndividualOrganizationException extends RuntimeException {
    public DuplicateIndividualOrganizationException(UUID ownerUserId) {
        super("User already has an individual organization: " + ownerUserId);
    }
}
