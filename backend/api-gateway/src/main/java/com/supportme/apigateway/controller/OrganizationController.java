package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.OrganizationResponseDto;
import com.supportme.proto.organization.v1.GetOrganizationRequest;
import com.supportme.proto.organization.v1.GetOrganizationResponse;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import io.grpc.StatusRuntimeException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestController
@Tag(name = "Organizations", description = "Read access to organization-level data, backed by the organization gRPC service.")
public class OrganizationController {

    private final OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub;

    public OrganizationController(OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub) {
        this.organizationServiceBlockingStub = organizationServiceBlockingStub;
    }

    @Operation(summary = "Get an organization by id", description = "Fetches organization details via a gRPC call to the organization service.")
    @GetMapping("/api/v1/organizations/{id}")
    public ResponseEntity<OrganizationResponseDto> getOrganization(@PathVariable String id) {
        try {
            GetOrganizationResponse response = organizationServiceBlockingStub.getOrganization(
                    GetOrganizationRequest.newBuilder().setId(id).build());

            return ResponseEntity.ok(new OrganizationResponseDto(
                    response.getId(),
                    response.getName(),
                    response.getDescription(),
                    Instant.ofEpochSecond(response.getCreatedAt().getSeconds(), response.getCreatedAt().getNanos())));
        } catch (StatusRuntimeException e) {
            HttpStatus status = switch (e.getStatus().getCode()) {
                case NOT_FOUND -> HttpStatus.NOT_FOUND;
                case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
                default -> HttpStatus.BAD_GATEWAY;
            };
            throw new ResponseStatusException(status, e.getStatus().getDescription(), e);
        }
    }
}
