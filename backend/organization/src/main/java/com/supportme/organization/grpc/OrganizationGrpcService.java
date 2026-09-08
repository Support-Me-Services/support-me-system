package com.supportme.organization.grpc;

import com.google.protobuf.Timestamp;
import com.supportme.organization.domain.Organization;
import com.supportme.organization.domain.OrganizationRepository;
import com.supportme.proto.organization.v1.GetOrganizationRequest;
import com.supportme.proto.organization.v1.GetOrganizationResponse;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
// TODO: verify the exact annotation package/name for registering a gRPC service bean with
// Spring gRPC's server auto-configuration (expected: org.springframework.grpc.server.service.GrpcService)
// against https://github.com/spring-projects/spring-grpc — this is NOT net.devh's annotation.
import org.springframework.grpc.server.service.GrpcService;

import java.util.UUID;

/**
 * Blocking gRPC service implementation, served on virtual threads (Spring gRPC + Spring MVC
 * blocking model, no WebFlux/reactive-grpc per architecture decision).
 */
@GrpcService
public class OrganizationGrpcService extends OrganizationServiceGrpc.OrganizationServiceImplBase {

    private final OrganizationRepository organizationRepository;

    public OrganizationGrpcService(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @Override
    public void getOrganization(GetOrganizationRequest request, StreamObserver<GetOrganizationResponse> responseObserver) {
        UUID id;
        try {
            id = UUID.fromString(request.getId());
        } catch (IllegalArgumentException e) {
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription("id must be a valid UUID")
                    .withCause(e)
                    .asRuntimeException());
            return;
        }

        Organization organization = organizationRepository.findById(id).orElse(null);
        if (organization == null) {
            responseObserver.onError(Status.NOT_FOUND
                    .withDescription("organization not found: " + id)
                    .asRuntimeException());
            return;
        }

        GetOrganizationResponse response = GetOrganizationResponse.newBuilder()
                .setId(organization.getId().toString())
                .setName(organization.getName())
                .setDescription(organization.getDescription() == null ? "" : organization.getDescription())
                .setCreatedAt(toTimestamp(organization.getCreatedAt()))
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    private static Timestamp toTimestamp(java.time.Instant instant) {
        return Timestamp.newBuilder()
                .setSeconds(instant.getEpochSecond())
                .setNanos(instant.getNano())
                .build();
    }
}
