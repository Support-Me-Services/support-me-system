package com.supportme.organization.service;

/** Thrown when accept/decline is attempted against an invitation whose status doesn't allow it. */
public class InvalidInvitationStateException extends RuntimeException {
    public InvalidInvitationStateException(String message) {
        super(message);
    }
}
