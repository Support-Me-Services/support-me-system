package com.supportme.organization.grpc;

import com.supportme.organization.domain.Organization;
import com.supportme.organization.service.OrganizationService;
import com.supportme.proto.organization.v1.ApproveOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.ApproveOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.ConfirmIndividualOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.ConfirmIndividualOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.CreateOrganizationRequest;
import com.supportme.proto.organization.v1.CreateOrganizationResponse;
import com.supportme.proto.organization.v1.GetOrganizationRequest;
import com.supportme.proto.organization.v1.GetOrganizationResponse;
import com.supportme.proto.organization.v1.GetPublicAboutPageRequest;
import com.supportme.proto.organization.v1.GetPublicAboutPageResponse;
import com.supportme.proto.organization.v1.ListMyOrganizationsRequest;
import com.supportme.proto.organization.v1.ListMyOrganizationsResponse;
import com.supportme.proto.organization.v1.ListOrganizationsPendingDeletionRequest;
import com.supportme.proto.organization.v1.ListOrganizationsPendingDeletionResponse;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import com.supportme.proto.organization.v1.RequestOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.RequestOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.StartIndividualOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.StartIndividualOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.UpdateAboutPageRequest;
import com.supportme.proto.organization.v1.UpdateAboutPageResponse;
import com.supportme.proto.organization.v1.UpdateContactInfoRequest;
import com.supportme.proto.organization.v1.UpdateContactInfoResponse;
import com.supportme.proto.organization.v1.WithdrawOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.WithdrawOrganizationDeletionResponse;
import io.grpc.stub.StreamObserver;
// TODO: verify the exact annotation package/name for registering a gRPC service bean with
// Spring gRPC's server auto-configuration (expected: org.springframework.grpc.server.service.GrpcService)
// against https://github.com/spring-projects/spring-grpc — this is NOT net.devh's annotation.
import org.springframework.grpc.server.service.GrpcService;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Blocking gRPC service implementation, served on virtual threads (Spring gRPC + Spring MVC
 * blocking model, no WebFlux/reactive-grpc per architecture decision). Pure adapter layer:
 * parses/validates wire types, delegates every business rule to OrganizationService, and maps
 * results/exceptions back to proto.
 */
@GrpcService
public class OrganizationGrpcService extends OrganizationServiceGrpc.OrganizationServiceImplBase {

    private final OrganizationService organizationService;

    public OrganizationGrpcService(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @Override
    public void createOrganization(CreateOrganizationRequest request, StreamObserver<CreateOrganizationResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            Organization organization = switch (request.getType()) {
                case ORGANIZATION_TYPE_IND -> organizationService.createIndividual(
                        actorUserId, requireNonBlank(request.getFirstName(), "first_name"),
                        requireNonBlank(request.getLastName(), "last_name"));
                case ORGANIZATION_TYPE_ORG -> organizationService.createOrg(
                        actorUserId, requireNonBlank(request.getName(), "name"),
                        requireNonBlank(request.getCategory(), "category"));
                default -> throw new IllegalArgumentException("type must be IND or ORG");
            };
            return CreateOrganizationResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    @Override
    public void getOrganization(GetOrganizationRequest request, StreamObserver<GetOrganizationResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            OrganizationService.OrganizationWithRole result = organizationService.getForActor(actorUserId, id);
            return GetOrganizationResponse.newBuilder()
                    .setOrganization(OrganizationMapper.toProto(result.organization(), result.role()))
                    .build();
        });
    }

    @Override
    public void listMyOrganizations(ListMyOrganizationsRequest request, StreamObserver<ListMyOrganizationsResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            List<OrganizationService.OrganizationWithRole> organizations = organizationService.listMine(actorUserId);
            ListMyOrganizationsResponse.Builder builder = ListMyOrganizationsResponse.newBuilder();
            organizations.forEach(entry -> builder.addOrganizations(
                    OrganizationMapper.toProto(entry.organization(), entry.role())));
            return builder.build();
        });
    }

    @Override
    public void updateAboutPage(UpdateAboutPageRequest request, StreamObserver<UpdateAboutPageResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Organization organization = organizationService.updateAboutPage(actorUserId, id, request.getAboutContent());
            return UpdateAboutPageResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    @Override
    public void updateContactInfo(UpdateContactInfoRequest request, StreamObserver<UpdateContactInfoResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Organization organization = organizationService.updateContactInfo(actorUserId, id,
                    request.getName(), request.getFirstName(), request.getLastName(), request.getPhoneNumber(),
                    request.getRole());
            return UpdateContactInfoResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    @Override
    public void getPublicAboutPage(GetPublicAboutPageRequest request, StreamObserver<GetPublicAboutPageResponse> responseObserver) {
        handle(responseObserver, () -> {
            Organization organization = organizationService.getPublicAboutPage(
                    OrganizationMapper.toDomainType(request.getType()), request.getCategorySlug(), request.getSlug());
            return GetPublicAboutPageResponse.newBuilder()
                    .setId(organization.getId().toString())
                    .setType(request.getType())
                    .setName(organization.getName())
                    .setAboutContent(organization.getAboutContent() == null ? "" : organization.getAboutContent())
                    .setUpdatedAt(OrganizationMapper.toTimestamp(organization.getUpdatedAt()))
                    .build();
        });
    }

    @Override
    public void requestOrganizationDeletion(RequestOrganizationDeletionRequest request, StreamObserver<RequestOrganizationDeletionResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Organization organization = organizationService.requestOrgDeletion(actorUserId, id);
            return RequestOrganizationDeletionResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    @Override
    public void withdrawOrganizationDeletion(WithdrawOrganizationDeletionRequest request, StreamObserver<WithdrawOrganizationDeletionResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Organization organization = organizationService.withdrawOrgDeletion(actorUserId, id);
            return WithdrawOrganizationDeletionResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    @Override
    public void listOrganizationsPendingDeletion(ListOrganizationsPendingDeletionRequest request, StreamObserver<ListOrganizationsPendingDeletionResponse> responseObserver) {
        handle(responseObserver, () -> {
            List<Organization> organizations = organizationService.listOrgsPendingDeletion();
            ListOrganizationsPendingDeletionResponse.Builder builder = ListOrganizationsPendingDeletionResponse.newBuilder();
            organizations.forEach(org -> builder.addOrganizations(OrganizationMapper.toProto(org)));
            return builder.build();
        });
    }

    @Override
    public void approveOrganizationDeletion(ApproveOrganizationDeletionRequest request, StreamObserver<ApproveOrganizationDeletionResponse> responseObserver) {
        handle(responseObserver, () -> {
            // actor_user_id is carried for audit logging only - the Super Administrator role
            // check already happened in api-gateway before this call was made.
            parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Organization organization = organizationService.approveOrgDeletion(id);
            return ApproveOrganizationDeletionResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    @Override
    public void startIndividualOrganizationDeletion(StartIndividualOrganizationDeletionRequest request, StreamObserver<StartIndividualOrganizationDeletionResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            OrganizationService.StartDeletionResult result = organizationService.startIndividualDeletion(actorUserId, id);
            return StartIndividualOrganizationDeletionResponse.newBuilder()
                    .setConfirmationToken(result.confirmationToken().toString())
                    .setExpiresAt(OrganizationMapper.toTimestamp(result.expiresAt()))
                    .build();
        });
    }

    @Override
    public void confirmIndividualOrganizationDeletion(ConfirmIndividualOrganizationDeletionRequest request, StreamObserver<ConfirmIndividualOrganizationDeletionResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            UUID token = parseUuid(request.getConfirmationToken(), "confirmation_token");
            Organization organization = organizationService.confirmIndividualDeletion(actorUserId, id, token);
            return ConfirmIndividualOrganizationDeletionResponse.newBuilder().setOrganization(OrganizationMapper.toProto(organization)).build();
        });
    }

    private static <T> void handle(StreamObserver<T> responseObserver, Supplier<T> action) {
        try {
            responseObserver.onNext(action.get());
            responseObserver.onCompleted();
        } catch (RuntimeException e) {
            responseObserver.onError(GrpcExceptionMapper.toStatusException(e));
        }
    }

    private static UUID parseUuid(String raw, String fieldName) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(fieldName + " must be a valid UUID: " + raw, e);
        }
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return value;
    }
}
