package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.OrganizationResponseDto;
import com.supportme.proto.organization.v1.ApproveOrganizationDeletionRequest;
import com.supportme.proto.organization.v1.ApproveOrganizationDeletionResponse;
import com.supportme.proto.organization.v1.ListOrganizationsPendingDeletionRequest;
import com.supportme.proto.organization.v1.ListOrganizationsPendingDeletionResponse;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Super Administrator dashboard for ORG deletion approvals. Restricted to the SUPER_ADMIN
 * realm role by SecurityConfig ("/api/v1/admin/**" -> hasRole("SUPER_ADMIN")) - a global role
 * check that belongs at the gateway, not per-resource in the organization service.
 */
@RestController
@RequestMapping("/api/v1/admin/organizations")
@Tag(name = "Super Administrator", description = "System-wide ORG deletion approval. Requires the SUPER_ADMIN realm role.")
public class AdminOrganizationController {

    private final OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub;

    public AdminOrganizationController(OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub) {
        this.organizationServiceBlockingStub = organizationServiceBlockingStub;
    }

    @Operation(summary = "List ORG organizations pending deletion", description = "Every ORG an administrator has flagged for deletion, awaiting final approval.")
    @GetMapping("/pending-deletion")
    public ResponseEntity<List<OrganizationResponseDto>> listPendingDeletion() {
        ListOrganizationsPendingDeletionResponse response = organizationServiceBlockingStub.listOrganizationsPendingDeletion(
                ListOrganizationsPendingDeletionRequest.newBuilder().build());
        return ResponseEntity.ok(response.getOrganizationsList().stream().map(OrganizationDtoMapper::toDto).toList());
    }

    @Operation(summary = "Approve (execute) an ORG deletion", description = "Final step: only a Super Administrator can actually delete an ORG.")
    @PostMapping("/{id}/approve-deletion")
    public ResponseEntity<OrganizationResponseDto> approveDeletion(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        ApproveOrganizationDeletionResponse response = organizationServiceBlockingStub.approveOrganizationDeletion(
                ApproveOrganizationDeletionRequest.newBuilder().setActorUserId(jwt.getSubject()).setId(id).build());
        return ResponseEntity.ok(OrganizationDtoMapper.toDto(response.getOrganization()));
    }
}
