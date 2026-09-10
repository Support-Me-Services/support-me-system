package com.supportme.organization.service;

import java.util.UUID;

public class AlreadyOrganizationMemberException extends RuntimeException {
    public AlreadyOrganizationMemberException(UUID userId, UUID organizationId) {
        super("User " + userId + " is already a member of organization " + organizationId);
    }
}
