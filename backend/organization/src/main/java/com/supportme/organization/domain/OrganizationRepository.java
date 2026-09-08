package com.supportme.organization.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
}
