package com.supportme.organization.service;

import java.util.UUID;

public class InvitationNotFoundException extends RuntimeException {
    public InvitationNotFoundException(UUID id) {
        super("Invitation not found: " + id);
    }
}
