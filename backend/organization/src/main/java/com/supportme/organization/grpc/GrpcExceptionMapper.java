package com.supportme.organization.grpc;

import com.supportme.organization.service.DuplicateIndividualOrganizationException;
import com.supportme.organization.service.InvalidDeletionConfirmationException;
import com.supportme.organization.service.InvalidOrganizationStateException;
import com.supportme.organization.service.OrganizationNotFoundException;
import com.supportme.organization.service.OrganizationPermissionDeniedException;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;

/** Maps OrganizationService's domain exceptions onto gRPC statuses api-gateway knows how to turn into HTTP responses. */
final class GrpcExceptionMapper {

    private GrpcExceptionMapper() {
    }

    static StatusRuntimeException toStatusException(RuntimeException e) {
        if (e instanceof OrganizationNotFoundException) {
            return Status.NOT_FOUND.withDescription(e.getMessage()).withCause(e).asRuntimeException();
        }
        if (e instanceof OrganizationPermissionDeniedException) {
            return Status.PERMISSION_DENIED.withDescription(e.getMessage()).withCause(e).asRuntimeException();
        }
        if (e instanceof DuplicateIndividualOrganizationException) {
            return Status.ALREADY_EXISTS.withDescription(e.getMessage()).withCause(e).asRuntimeException();
        }
        if (e instanceof InvalidOrganizationStateException) {
            return Status.FAILED_PRECONDITION.withDescription(e.getMessage()).withCause(e).asRuntimeException();
        }
        if (e instanceof InvalidDeletionConfirmationException) {
            return Status.FAILED_PRECONDITION.withDescription(e.getMessage()).withCause(e).asRuntimeException();
        }
        if (e instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(e.getMessage()).withCause(e).asRuntimeException();
        }
        return Status.INTERNAL.withDescription("Unexpected error").withCause(e).asRuntimeException();
    }
}
