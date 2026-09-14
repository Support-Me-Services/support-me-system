package com.supportme.organization.grpc;

import com.supportme.organization.domain.Invitation;
import com.supportme.organization.service.InvitationService;
import com.supportme.proto.organization.v1.AcceptInvitationRequest;
import com.supportme.proto.organization.v1.AcceptInvitationResponse;
import com.supportme.proto.organization.v1.DeclineInvitationRequest;
import com.supportme.proto.organization.v1.DeclineInvitationResponse;
import com.supportme.proto.organization.v1.InvitationServiceGrpc;
import com.supportme.proto.organization.v1.ListMyInvitationsRequest;
import com.supportme.proto.organization.v1.ListMyInvitationsResponse;
import com.supportme.proto.organization.v1.ListSentInvitationsRequest;
import com.supportme.proto.organization.v1.ListSentInvitationsResponse;
import com.supportme.proto.organization.v1.SendInvitationRequest;
import com.supportme.proto.organization.v1.SendInvitationResponse;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;

import java.util.UUID;
import java.util.function.Supplier;

/** Pure adapter layer - see OrganizationGrpcService's class doc for the shared conventions. */
@GrpcService
public class InvitationGrpcService extends InvitationServiceGrpc.InvitationServiceImplBase {

    private final InvitationService invitationService;

    public InvitationGrpcService(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @Override
    public void sendInvitation(SendInvitationRequest request, StreamObserver<SendInvitationResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID organizationId = parseUuid(request.getOrganizationId(), "organization_id");
            UUID invitedUserId = parseUuid(request.getInvitedUserId(), "invited_user_id");
            Invitation invitation = invitationService.send(actorUserId, organizationId, invitedUserId, request.getMessage());
            return SendInvitationResponse.newBuilder()
                    .setInvitation(InvitationMapper.toProto(invitation, ""))
                    .build();
        });
    }

    @Override
    public void listMyInvitations(ListMyInvitationsRequest request, StreamObserver<ListMyInvitationsResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            ListMyInvitationsResponse.Builder builder = ListMyInvitationsResponse.newBuilder();
            invitationService.listMine(actorUserId).forEach(summary -> builder.addInvitations(
                    InvitationMapper.toProto(summary.invitation(), summary.organizationName())));
            return builder.build();
        });
    }

    @Override
    public void listSentInvitations(ListSentInvitationsRequest request, StreamObserver<ListSentInvitationsResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            ListSentInvitationsResponse.Builder builder = ListSentInvitationsResponse.newBuilder();
            invitationService.listSent(actorUserId).forEach(summary -> builder.addInvitations(
                    InvitationMapper.toProto(summary.invitation(), summary.organizationName())));
            return builder.build();
        });
    }

    @Override
    public void acceptInvitation(AcceptInvitationRequest request, StreamObserver<AcceptInvitationResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Invitation invitation = invitationService.accept(actorUserId, id);
            return AcceptInvitationResponse.newBuilder()
                    .setInvitation(InvitationMapper.toProto(invitation, ""))
                    .build();
        });
    }

    @Override
    public void declineInvitation(DeclineInvitationRequest request, StreamObserver<DeclineInvitationResponse> responseObserver) {
        handle(responseObserver, () -> {
            UUID actorUserId = parseUuid(request.getActorUserId(), "actor_user_id");
            UUID id = parseUuid(request.getId(), "id");
            Invitation invitation = invitationService.decline(actorUserId, id);
            return DeclineInvitationResponse.newBuilder()
                    .setInvitation(InvitationMapper.toProto(invitation, ""))
                    .build();
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
}
