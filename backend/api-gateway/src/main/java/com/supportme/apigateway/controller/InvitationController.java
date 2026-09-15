package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.InvitationResponseDto;
import com.supportme.proto.organization.v1.AcceptInvitationRequest;
import com.supportme.proto.organization.v1.AcceptInvitationResponse;
import com.supportme.proto.organization.v1.DeclineInvitationRequest;
import com.supportme.proto.organization.v1.DeclineInvitationResponse;
import com.supportme.proto.organization.v1.DeleteInvitationRequest;
import com.supportme.proto.organization.v1.InvitationServiceGrpc;
import com.supportme.proto.organization.v1.ListMyInvitationsRequest;
import com.supportme.proto.organization.v1.ListMyInvitationsResponse;
import com.supportme.proto.organization.v1.ListSentInvitationsRequest;
import com.supportme.proto.organization.v1.ListSentInvitationsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Authenticated, self-service invitation inbox (SCRUM-189): list invitations addressed to the
 * caller and accept/decline them. Sending an invitation instead lives on OrganizationController
 * (it's a sub-resource of the organization being invited to - see SCRUM-188).
 */
@RestController
@RequestMapping("/api/v1/invitations")
@Tag(name = "Invitations", description = "Authenticated organization invitation inbox.")
public class InvitationController {

    private final InvitationServiceGrpc.InvitationServiceBlockingStub invitationServiceBlockingStub;

    public InvitationController(InvitationServiceGrpc.InvitationServiceBlockingStub invitationServiceBlockingStub) {
        this.invitationServiceBlockingStub = invitationServiceBlockingStub;
    }

    @Operation(summary = "List my pending invitations",
            description = "Every PENDING invitation addressed to the caller, across all organizations.")
    @GetMapping("/mine")
    public ResponseEntity<List<InvitationResponseDto>> listMine(@AuthenticationPrincipal Jwt jwt) {
        ListMyInvitationsResponse response = invitationServiceBlockingStub.listMyInvitations(
                ListMyInvitationsRequest.newBuilder().setActorUserId(jwt.getSubject()).build());
        return ResponseEntity.ok(response.getInvitationsList().stream().map(InvitationDtoMapper::toDto).toList());
    }

    @Operation(summary = "List invitations I've sent",
            description = "Every invitation the caller has sent (any status), across every organization they administer.")
    @GetMapping("/sent")
    public ResponseEntity<List<InvitationResponseDto>> listSent(@AuthenticationPrincipal Jwt jwt) {
        ListSentInvitationsResponse response = invitationServiceBlockingStub.listSentInvitations(
                ListSentInvitationsRequest.newBuilder().setActorUserId(jwt.getSubject()).build());
        return ResponseEntity.ok(response.getInvitationsList().stream().map(InvitationDtoMapper::toDto).toList());
    }

    @Operation(summary = "Accept an invitation",
            description = "Caller must be the invited user. Idempotent: accepting an already-accepted invitation is a no-op.")
    @PostMapping("/{id}/accept")
    public ResponseEntity<InvitationResponseDto> accept(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        AcceptInvitationResponse response = invitationServiceBlockingStub.acceptInvitation(
                AcceptInvitationRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.ok(InvitationDtoMapper.toDto(response.getInvitation()));
    }

    @Operation(summary = "Decline an invitation",
            description = "Caller must be the invited user. Idempotent: declining an already-declined invitation is a no-op.")
    @PostMapping("/{id}/decline")
    public ResponseEntity<InvitationResponseDto> decline(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        DeclineInvitationResponse response = invitationServiceBlockingStub.declineInvitation(
                DeclineInvitationRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.ok(InvitationDtoMapper.toDto(response.getInvitation()));
    }

    @Operation(summary = "Delete a sent invitation",
            description = "Caller must administer the invitation's organization. Removes it regardless of status.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        invitationServiceBlockingStub.deleteInvitation(
                DeleteInvitationRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.noContent().build();
    }
}
