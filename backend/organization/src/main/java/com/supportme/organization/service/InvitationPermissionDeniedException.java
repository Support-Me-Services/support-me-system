package com.supportme.organization.service;

import java.util.UUID;

/** Thrown when the actor is authenticated but isn't the invitee for this invitation. */
public class InvitationPermissionDeniedException extends RuntimeException {
    public InvitationPermissionDeniedException(UUID actorUserId, UUID invitationId) {
        super("User " + actorUserId + " may not act on invitation " + invitationId);
    }
}
