package com.supportme.organization.service;

import com.supportme.organization.domain.Invitation;
import com.supportme.organization.domain.InvitationRepository;
import com.supportme.organization.domain.InvitationStatus;
import com.supportme.organization.domain.MembershipRole;
import com.supportme.organization.domain.Organization;
import com.supportme.organization.domain.OrganizationMembership;
import com.supportme.organization.domain.OrganizationMembershipRepository;
import com.supportme.organization.domain.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Owns organization invitations: an ORG administrator invites a user by id (SCRUM-188); the
 * invited user accepts (joins as an ADMINISTRATOR member - the only MembershipRole this
 * codebase defines today, same role createOrg grants its creator) or declines (SCRUM-189). See
 * invitation.proto's service-level doc comment for the authorization split this follows.
 */
@Service
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public InvitationService(InvitationRepository invitationRepository,
                              OrganizationRepository organizationRepository,
                              OrganizationMembershipRepository membershipRepository) {
        this.invitationRepository = invitationRepository;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
    }

    @Transactional
    public Invitation send(UUID actorUserId, UUID organizationId, UUID invitedUserId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        if (organization.isIndividual()) {
            throw new InvalidOrganizationStateException(
                    "Action only applies to ORG organizations: " + organizationId);
        }
        requireAdministrator(actorUserId, organization);

        if (membershipRepository.findByOrganizationIdAndUserId(organizationId, invitedUserId).isPresent()) {
            throw new AlreadyOrganizationMemberException(invitedUserId, organizationId);
        }
        if (invitationRepository.existsByOrganizationIdAndInvitedUserIdAndStatus(
                organizationId, invitedUserId, InvitationStatus.PENDING)) {
            throw new DuplicateInvitationException(invitedUserId, organizationId);
        }

        Invitation invitation = Invitation.create(
                UUID.randomUUID(), organizationId, invitedUserId, actorUserId, Instant.now());
        return invitationRepository.save(invitation);
    }

    @Transactional(readOnly = true)
    public List<InvitationWithOrganizationName> listMine(UUID actorUserId) {
        return invitationRepository.findByInvitedUserIdAndStatus(actorUserId, InvitationStatus.PENDING).stream()
                .map(invitation -> new InvitationWithOrganizationName(invitation,
                        organizationRepository.findById(invitation.getOrganizationId())
                                .map(Organization::getName)
                                .orElse("")))
                .toList();
    }

    /** Every invitation the actor has sent (any status), across every organization they administer. */
    @Transactional(readOnly = true)
    public List<InvitationWithOrganizationName> listSent(UUID actorUserId) {
        return invitationRepository.findByInvitedByUserIdOrderByCreatedAtDesc(actorUserId).stream()
                .map(invitation -> new InvitationWithOrganizationName(invitation,
                        organizationRepository.findById(invitation.getOrganizationId())
                                .map(Organization::getName)
                                .orElse("")))
                .toList();
    }

    @Transactional
    public Invitation accept(UUID actorUserId, UUID invitationId) {
        Invitation invitation = loadExisting(invitationId);
        requireInvitee(actorUserId, invitation);
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            return invitation;
        }
        requirePending(invitation);

        Instant now = Instant.now();
        invitation.accept(now);
        if (membershipRepository.findByOrganizationIdAndUserId(invitation.getOrganizationId(), actorUserId).isEmpty()) {
            membershipRepository.save(new OrganizationMembership(
                    UUID.randomUUID(), invitation.getOrganizationId(), actorUserId, MembershipRole.ADMINISTRATOR, now));
        }
        return invitation;
    }

    @Transactional
    public Invitation decline(UUID actorUserId, UUID invitationId) {
        Invitation invitation = loadExisting(invitationId);
        requireInvitee(actorUserId, invitation);
        if (invitation.getStatus() == InvitationStatus.DECLINED) {
            return invitation;
        }
        requirePending(invitation);

        invitation.decline(Instant.now());
        return invitation;
    }

    private static void requirePending(Invitation invitation) {
        if (!invitation.isPending()) {
            throw new InvalidInvitationStateException(
                    "Invitation " + invitation.getId() + " is not pending (status=" + invitation.getStatus() + ")");
        }
    }

    private void requireAdministrator(UUID actorUserId, Organization organization) {
        boolean isAdmin = membershipRepository.existsByOrganizationIdAndUserIdAndRole(
                organization.getId(), actorUserId, MembershipRole.ADMINISTRATOR);
        if (!isAdmin) {
            throw new OrganizationPermissionDeniedException(actorUserId, organization.getId(), "invite users to");
        }
    }

    private void requireInvitee(UUID actorUserId, Invitation invitation) {
        if (!invitation.getInvitedUserId().equals(actorUserId)) {
            throw new InvitationPermissionDeniedException(actorUserId, invitation.getId());
        }
    }

    private Invitation loadExisting(UUID invitationId) {
        return invitationRepository.findById(invitationId)
                .orElseThrow(() -> new InvitationNotFoundException(invitationId));
    }

    public record InvitationWithOrganizationName(Invitation invitation, String organizationName) {
    }
}
