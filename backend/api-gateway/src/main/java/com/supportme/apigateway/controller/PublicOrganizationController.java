package com.supportme.apigateway.controller;

import com.supportme.apigateway.dto.PublicAboutPageResponseDto;
import com.supportme.proto.organization.v1.GetPublicAboutPageRequest;
import com.supportme.proto.organization.v1.GetPublicAboutPageResponse;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import com.supportme.proto.organization.v1.OrganizationType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Guest-facing "wizytowka" (about page) lookup - no authentication, matches the public URL
 * structure from SCRUM-183: /ind/{nazwisko-imie}/about and /org/{category-slug}/{name-slug}/about.
 * Permitted without a JWT - see SecurityConfig's permitAll rule for /api/v1/public/**.
 */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Public organization pages", description = "Unauthenticated access to an organization's public 'about' page.")
public class PublicOrganizationController {

    private final OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub;

    public PublicOrganizationController(OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub) {
        this.organizationServiceBlockingStub = organizationServiceBlockingStub;
    }

    @Operation(summary = "Get an individual's public about page")
    @GetMapping("/ind/{slug}/about")
    public ResponseEntity<PublicAboutPageResponseDto> getIndividualAboutPage(@PathVariable String slug) {
        GetPublicAboutPageResponse response = organizationServiceBlockingStub.getPublicAboutPage(
                GetPublicAboutPageRequest.newBuilder()
                        .setType(OrganizationType.ORGANIZATION_TYPE_IND)
                        .setSlug(slug)
                        .build());
        return ResponseEntity.ok(OrganizationDtoMapper.toPublicDto(response));
    }

    @Operation(summary = "Get an ORG's public about page")
    @GetMapping("/org/{categorySlug}/{nameSlug}/about")
    public ResponseEntity<PublicAboutPageResponseDto> getOrgAboutPage(@PathVariable String categorySlug,
                                                                       @PathVariable String nameSlug) {
        GetPublicAboutPageResponse response = organizationServiceBlockingStub.getPublicAboutPage(
                GetPublicAboutPageRequest.newBuilder()
                        .setType(OrganizationType.ORGANIZATION_TYPE_ORG)
                        .setCategorySlug(categorySlug)
                        .setSlug(nameSlug)
                        .build());
        return ResponseEntity.ok(OrganizationDtoMapper.toPublicDto(response));
    }
}
