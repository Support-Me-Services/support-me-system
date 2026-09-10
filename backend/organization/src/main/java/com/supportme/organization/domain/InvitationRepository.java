package com.supportme.organization.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    boolean existsByOrganizationIdAndInvitedUserIdAndStatus(UUID organizationId, UUID invitedUserId,
                                                              InvitationStatus status);

    List<Invitation> findByInvitedUserIdAndStatus(UUID invitedUserId, InvitationStatus status);

    List<Invitation> findByInvitedByUserIdOrderByCreatedAtDesc(UUID invitedByUserId);
}
