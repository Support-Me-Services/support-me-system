package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.ConfirmDeletionRequestDto;
import com.supportme.apigateway.dto.CreateOrganizationRequestDto;
import com.supportme.apigateway.dto.DeletionConfirmationStartedDto;
import com.supportme.apigateway.dto.InvitationResponseDto;
import com.supportme.apigateway.dto.OrganizationResponseDto;
import com.supportme.apigateway.dto.SendInvitationRequestDto;
import com.supportme.apigateway.dto.UpdateAboutPageRequestDto;
import com.supportme.apigateway.dto.UpdateContactInfoRequestDto;
import com.supportme.proto.organization.v1.ConfirmIndividualOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.ConfirmIndividualOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.CreateOrganizationRequest;
import com.supportme.proto.organization.v1.CreateOrganizationResponse;
import com.supportme.proto.organization.v1.GetOrganizationRequest;
import com.supportme.proto.organization.v1.GetOrganizationResponse;
import com.supportme.proto.organization.v1.InvitationServiceGrpc;
import com.supportme.proto.organization.v1.ListMyOrganizationsRequest;
import com.supportme.proto.organization.v1.ListMyOrganizationsResponse;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import com.supportme.proto.organization.v1.RequestOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.RequestOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.StartIndividualOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.StartIndividualOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.UpdateAboutPageRequest;
import com.supportme.proto.organization.v1.UpdateAboutPageResponse;
import com.supportme.proto.organization.v1.SendInvitationRequest;
import com.supportme.proto.organization.v1.SendInvitationResponse;
import com.supportme.proto.organization.v1.UpdateContactInfoRequest;
import com.supportme.proto.organization.v1.UpdateContactInfoResponse;
import com.supportme.proto.organization.v1.WithdrawOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.WithdrawOrganizationDeletionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Authenticated organization management: create, view/list your own, edit the about page, and
 * the two deletion workflows (see organization.proto for the authorization split between this
 * gateway and the organization service).
 */
@RestController
@RequestMapping("/api/v1/organizations")
@Tag(name = "Organizations", description = "Authenticated organization management.")
public class OrganizationController {

    private final OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub;
    private final InvitationServiceGrpc.InvitationServiceBlockingStub invitationServiceBlockingStub;

    public OrganizationController(OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub,
                                   InvitationServiceGrpc.InvitationServiceBlockingStub invitationServiceBlockingStub) {
        this.organizationServiceBlockingStub = organizationServiceBlockingStub;
        this.invitationServiceBlockingStub = invitationServiceBlockingStub;
    }

    @Operation(summary = "Create an organization",
            description = "Creates an IND (max one per user) or ORG (creator becomes its first ADMINISTRATOR) organization.")
    @PostMapping
    public ResponseEntity<OrganizationResponseDto> create(@AuthenticationPrincipal Jwt jwt,
                                                            @Valid @RequestBody CreateOrganizationRequestDto request) {
        CreateOrganizationRequest.Builder grpcRequest = CreateOrganizationRequest.newBuilder()
                .setActorUserId(jwt.getSubject())
                .setType(OrganizationDtoMapper.toProtoType(request.type()));
        if (request.name() != null) {
            grpcRequest.setName(request.name());
        }
        if (request.category() != null) {
            grpcRequest.setCategory(request.category());
        }
        if (request.firstName() != null) {
            grpcRequest.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            grpcRequest.setLastName(request.lastName());
        }

        CreateOrganizationResponse response = organizationServiceBlockingStub.createOrganization(grpcRequest.build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "List my organizations", description = "Every organization the caller owns (IND) or administers (ORG).")
    @GetMapping("/mine")
    public ResponseEntity<List<OrganizationResponseDto>> listMine(@AuthenticationPrincipal Jwt jwt) {
        ListMyOrganizationsResponse response = organizationServiceBlockingStub.listMyOrganizations(
                ListMyOrganizationsRequest.newBuilder().setActorUserId(jwt.getSubject()).build());
        return ResponseEntity.ok(response.getOrganizationsList().stream().map(OrganizationDtoMapper::toDto).toList());
    }

    @Operation(summary = "Get an organization", description = "Caller must be the IND owner or an ORG administrator.")
    @GetMapping("/{id}")
    public ResponseEntity<OrganizationResponseDto> get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        GetOrganizationResponse response = organizationServiceBlockingStub.getOrganization(
                GetOrganizationRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "Update the about page", description = "Rich-text content is sanitized server-side before it's stored.")
    @PatchMapping("/{id}/about")
    public ResponseEntity<OrganizationResponseDto> updateAboutPage(@AuthenticationPrincipal Jwt jwt,
                                                                     @PathVariable String id,
                                                                     @Valid @RequestBody UpdateAboutPageRequestDto request) {
        UpdateAboutPageResponse response = organizationServiceBlockingStub.updateAboutPage(
                UpdateAboutPageRequest.newBuilder()
                        .setActorUserId(jwt.getSubject())
                        .setId(id)
                        .setAboutContent(request.aboutContent())
                        .build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "Update the contact info", description = "\"Informacja kontaktowa\" panel - currently just the phone number.")
    @PatchMapping("/{id}/contact-info")
    public ResponseEntity<OrganizationResponseDto> updateContactInfo(@AuthenticationPrincipal Jwt jwt,
                                                                        @PathVariable String id,
                                                                        @Valid @RequestBody UpdateContactInfoRequestDto request) {
        UpdateContactInfoRequest.Builder grpcRequest = UpdateContactInfoRequest.newBuilder()
                .setActorUserId(jwt.getSubject())
                .setId(id);
        if (request.name() != null) {
            grpcRequest.setName(request.name());
        }
        if (request.firstName() != null) {
            grpcRequest.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            grpcRequest.setLastName(request.lastName());
        }
        if (request.phoneNumber() != null) {
            grpcRequest.setPhoneNumber(request.phoneNumber());
        }
        if (request.role() != null) {
            grpcRequest.setRole(request.role());
        }
        UpdateContactInfoResponse response = organizationServiceBlockingStub.updateContactInfo(grpcRequest.build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "Request ORG deletion", description = "ORG only. Flags the organization 'to be deleted'; a Super Administrator must still approve it.")
    @PostMapping("/{id}/deletion-request")
    public ResponseEntity<OrganizationResponseDto> requestDeletion(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        RequestOrganizationDeletionResponse response = organizationServiceBlockingStub.requestOrganizationDeletion(
                RequestOrganizationDeletionRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "Withdraw an ORG deletion request", description = "ORG only. Any administrator may withdraw it, not just whoever requested it.")
    @DeleteMapping("/{id}/deletion-request")
    public ResponseEntity<OrganizationResponseDto> withdrawDeletionRequest(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        WithdrawOrganizationDeletionResponse response = organizationServiceBlockingStub.withdrawOrganizationDeletion(
                WithdrawOrganizationDeletionRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "Start IND deletion (step 1 of 2)",
            description = "IND only, owner only. Returns a confirmation token valid for a short time; echo it back to step 2 to actually delete.")
    @PostMapping("/{id}/deletion-confirmation")
    public ResponseEntity<DeletionConfirmationStartedDto> startDeletion(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        StartIndividualOrganizationDeletionResponse response = organizationServiceBlockingStub.startIndividualOrganizationDeletion(
                StartIndividualOrganizationDeletionRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        Instant expiresAt = Instant.ofEpochSecond(response.getExpiresAt().getSeconds(), response.getExpiresAt().getNanos());
        return ResponseEntity.ok(new DeletionConfirmationStartedDto(response.getConfirmationToken(), expiresAt));
    }

    @Operation(summary = "Confirm IND deletion (step 2 of 2)",
            description = "IND only, owner only. Executes the deletion if confirmationToken matches the one from step 1 and hasn't expired.")
    @PutMapping("/{id}/deletion-confirmation")
    public ResponseEntity<OrganizationResponseDto> confirmDeletion(@AuthenticationPrincipal Jwt jwt,
                                                                     @PathVariable String id,
                                                                     @Valid @RequestBody ConfirmDeletionRequestDto request) {
        ConfirmIndividualOrganizationDeletionResponse response = organizationServiceBlockingStub.confirmIndividualOrganizationDeletion(
                ConfirmIndividualOrganizationDeletionRequest.newBuilder()
                        .setActorUserId(jwt.getSubject())
                        .setId(id)
                        .setConfirmationToken(request.confirmationToken())
                        .build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }

    @Operation(summary = "Invite a user to this organization",
            description = "ORG only, caller must administer it. Fails if the user is already a member or already has a pending invitation.")
    @PostMapping("/{id}/invitations")
    public ResponseEntity<InvitationResponseDto> sendInvitation(@AuthenticationPrincipal Jwt jwt,
                                                                   @PathVariable String id,
                                                                   @Valid @RequestBody SendInvitationRequestDto request) {
        SendInvitationResponse response = invitationServiceBlockingStub.sendInvitation(
                SendInvitationRequest.newBuilder()
                        .setActorUserId(jwt.getSubject())
                        .setOrganizationId(id)
                        .setInvitedUserId(request.invitedUserId())
                        .setMessage(request.message() == null ? "" : request.message())
                        .build());
        return ResponseEntity.ok(InvitationDtoMapper.toDto(response.getInvitation()));
    }
}
