package com.supportme.organization.service;

/** Thrown when an action is attempted against an organization in a state that doesn't allow it (e.g. requesting deletion twice). */
public class InvalidOrganizationStateException extends RuntimeException {
    public InvalidOrganizationStateException(String message) {
        super(message);
    }
}
