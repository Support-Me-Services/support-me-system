package com.supportme.organization.service;

/** Thrown when the second step of the IND double-confirmation delete flow gets a missing, wrong, or expired token. */
public class InvalidDeletionConfirmationException extends RuntimeException {
    public InvalidDeletionConfirmationException(String message) {
        super(message);
    }
}
