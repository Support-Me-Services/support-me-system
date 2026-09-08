package com.supportme.organization.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    boolean existsByOwnerUserIdAndTypeAndStatusNot(UUID ownerUserId, OrganizationType type, OrganizationStatus status);

    boolean existsBySlugAndType(String slug, OrganizationType type);

    boolean existsByCategorySlugAndSlugAndType(String categorySlug, String slug, OrganizationType type);

    Optional<Organization> findBySlugAndType(String slug, OrganizationType type);

    Optional<Organization> findByCategorySlugAndSlugAndType(String categorySlug, String slug, OrganizationType type);

    List<Organization> findByOwnerUserIdAndTypeAndStatusNot(UUID ownerUserId, OrganizationType type, OrganizationStatus status);

    List<Organization> findByStatus(OrganizationStatus status);
}
