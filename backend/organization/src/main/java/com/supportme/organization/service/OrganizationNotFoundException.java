package com.supportme.organization.service;

import java.util.UUID;

public class OrganizationNotFoundException extends RuntimeException {
    public OrganizationNotFoundException(UUID id) {
        super("Organization not found: " + id);
    }

    public OrganizationNotFoundException(String message) {
        super(message);
    }
}
