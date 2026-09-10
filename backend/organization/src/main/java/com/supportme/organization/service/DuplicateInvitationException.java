package com.supportme.organization.service;

import java.util.UUID;

public class DuplicateInvitationException extends RuntimeException {
    public DuplicateInvitationException(UUID invitedUserId, UUID organizationId) {
        super("A pending invitation already exists for user " + invitedUserId + " to organization " + organizationId);
    }
}
