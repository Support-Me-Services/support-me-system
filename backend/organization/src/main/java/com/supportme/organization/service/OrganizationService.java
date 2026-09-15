package com.supportme.organization.service;

import com.supportme.organization.domain.MembershipRole;
import com.supportme.organization.domain.Organization;
import com.supportme.organization.domain.OrganizationMembership;
import com.supportme.organization.domain.OrganizationMembershipRepository;
import com.supportme.organization.domain.OrganizationRepository;
import com.supportme.organization.domain.OrganizationStatus;
import com.supportme.organization.domain.OrganizationType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Owns every business rule for organization management (SCRUM-183): the IND/ORG creation
 * invariants, slug assignment, the public "about" page, and the two very different deletion
 * workflows. See organization.proto's service-level doc comment for the authorization split
 * between this class (fine-grained, resource-level checks) and api-gateway (authentication +
 * the global Super Administrator role check).
 */
@Service
public class OrganizationService {

    /** How long a step-1 IND deletion confirmation token stays valid before step 2 must use it. */
    static final Duration DELETION_CONFIRMATION_TTL = Duration.ofMinutes(10);

    private static final int MAX_SLUG_ATTEMPTS = 5;

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final AboutContentSanitizer aboutContentSanitizer;

    public OrganizationService(OrganizationRepository organizationRepository,
                                OrganizationMembershipRepository membershipRepository,
                                AboutContentSanitizer aboutContentSanitizer) {
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.aboutContentSanitizer = aboutContentSanitizer;
    }

    @Transactional
    public Organization createIndividual(UUID actorUserId, String firstName, String lastName) {
        if (organizationRepository.existsByOwnerUserIdAndTypeAndStatusNot(
                actorUserId, OrganizationType.IND, OrganizationStatus.DELETED)) {
            throw new DuplicateIndividualOrganizationException(actorUserId);
        }

        String baseSlug = SlugGenerator.slugify(lastName + "-" + firstName);
        return createWithSlugRetry(baseSlug,
                candidate -> Organization.createIndividual(UUID.randomUUID(), actorUserId, firstName, lastName,
                        candidate, Instant.now()),
                candidate -> organizationRepository.existsBySlugAndType(candidate, OrganizationType.IND));
    }

    @Transactional
    public Organization createOrg(UUID actorUserId, String name, String category) {
        String categorySlug = SlugGenerator.slugify(category);
        String baseSlug = SlugGenerator.slugify(name);

        Organization organization = createWithSlugRetry(baseSlug,
                candidate -> Organization.createOrg(UUID.randomUUID(), actorUserId, name, category, categorySlug,
                        candidate, Instant.now()),
                candidate -> organizationRepository.existsByCategorySlugAndSlugAndType(
                        categorySlug, candidate, OrganizationType.ORG));

        membershipRepository.save(new OrganizationMembership(
                UUID.randomUUID(), organization.getId(), actorUserId, MembershipRole.ADMINISTRATOR, Instant.now()));
        return organization;
    }

    private Organization createWithSlugRetry(String baseSlug,
                                              java.util.function.Function<String, Organization> factory,
                                              java.util.function.Predicate<String> isTaken) {
        String candidate = baseSlug;
        for (int attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
            candidate = SlugGenerator.firstAvailable(candidate, isTaken);
            try {
                return organizationRepository.saveAndFlush(factory.apply(candidate));
            } catch (DataIntegrityViolationException raceLostSlug) {
                // Another request took this exact slug between our existence check and the
                // insert; bump the candidate past it and try again rather than surfacing a
                // spurious 500 to the caller.
                candidate = candidate + "-" + (attempt + 1);
            }
        }
        throw new IllegalStateException("Could not allocate a unique slug from base: " + baseSlug);
    }

    @Transactional(readOnly = true)
    public OrganizationWithRole getForActor(UUID actorUserId, UUID organizationId) {
        Organization organization = loadExisting(organizationId);
        requireViewAccess(actorUserId, organization);
        MembershipRole role = organization.isIndividual()
                ? MembershipRole.ADMINISTRATOR
                : membershipRepository.findByOrganizationIdAndUserId(organizationId, actorUserId)
                        .map(OrganizationMembership::getRole)
                        .orElse(MembershipRole.ADMINISTRATOR);
        return new OrganizationWithRole(organization, role);
    }

    /** Every organization the actor owns (as ADMINISTRATOR-equivalent) or is a member of, each tagged with their role. */
    @Transactional(readOnly = true)
    public List<OrganizationWithRole> listMine(UUID actorUserId) {
        List<OrganizationWithRole> owned = organizationRepository.findByOwnerUserIdAndTypeAndStatusNot(
                actorUserId, OrganizationType.IND, OrganizationStatus.DELETED).stream()
                .map(org -> new OrganizationWithRole(org, MembershipRole.ADMINISTRATOR))
                .toList();

        List<OrganizationWithRole> memberOf = membershipRepository.findByUserId(actorUserId).stream()
                .map(membership -> {
                    Organization org = organizationRepository.findById(membership.getOrganizationId()).orElse(null);
                    return org == null || org.getStatus() == OrganizationStatus.DELETED
                            ? null : new OrganizationWithRole(org, membership.getRole());
                })
                .filter(java.util.Objects::nonNull)
                .toList();

        return java.util.stream.Stream.concat(owned.stream(), memberOf.stream()).toList();
    }

    @Transactional
    public Organization updateAboutPage(UUID actorUserId, UUID organizationId, String rawHtml) {
        Organization organization = loadExisting(organizationId);
        requireEditAccess(actorUserId, organization);
        if (organization.getStatus() == OrganizationStatus.DELETED) {
            throw new InvalidOrganizationStateException("Cannot edit a deleted organization: " + organizationId);
        }
        organization.updateAboutContent(aboutContentSanitizer.sanitize(rawHtml), Instant.now());
        return organization;
    }

    /**
     * Backs both the org-detail "Informacja kontaktowa" tab (phone only - name fields are
     * simply re-sent unchanged from already-loaded data) and the "Zarządzanie kontem" screen
     * (name/first+last name together with phone).
     */
    @Transactional
    public Organization updateContactInfo(UUID actorUserId, UUID organizationId, String name, String firstName,
                                           String lastName, String phoneNumber, String role) {
        Organization organization = loadExisting(organizationId);
        requireEditAccess(actorUserId, organization);
        if (organization.getStatus() == OrganizationStatus.DELETED) {
            throw new InvalidOrganizationStateException("Cannot edit a deleted organization: " + organizationId);
        }
        if (organization.isIndividual()) {
            organization.updateIndividualProfile(firstName, lastName, phoneNumber, role, Instant.now());
        } else {
            organization.updateOrgProfile(name, phoneNumber, role, Instant.now());
        }
        return organization;
    }

    @Transactional(readOnly = true)
    public Organization getPublicAboutPage(OrganizationType type, String categorySlug, String slug) {
        Organization organization = (type == OrganizationType.IND
                ? organizationRepository.findBySlugAndType(slug, OrganizationType.IND)
                : organizationRepository.findByCategorySlugAndSlugAndType(categorySlug, slug, OrganizationType.ORG))
                .orElseThrow(() -> new OrganizationNotFoundException(
                        "No " + type + " organization for slug '" + slug + "'"
                                + (categorySlug == null ? "" : "' in category '" + categorySlug + "'")));

        if (organization.getStatus() == OrganizationStatus.DELETED) {
            throw new OrganizationNotFoundException(organization.getId());
        }
        return organization;
    }

    @Transactional
    public Organization requestOrgDeletion(UUID actorUserId, UUID organizationId) {
        Organization organization = requireOrgType(loadExisting(organizationId));
        requireAdministrator(actorUserId, organization, "request deletion of");
        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidOrganizationStateException(
                    "Organization " + organizationId + " is not ACTIVE (status=" + organization.getStatus() + ")");
        }
        organization.markPendingDeletion(actorUserId, Instant.now());
        return organization;
    }

    @Transactional
    public Organization withdrawOrgDeletion(UUID actorUserId, UUID organizationId) {
        Organization organization = requireOrgType(loadExisting(organizationId));
        requireAdministrator(actorUserId, organization, "withdraw the deletion request of");
        if (organization.getStatus() != OrganizationStatus.PENDING_DELETION) {
            throw new InvalidOrganizationStateException(
                    "Organization " + organizationId + " has no pending deletion request to withdraw");
        }
        organization.clearPendingDeletion(Instant.now());
        return organization;
    }

    /** Super Administrator only - role already checked by the gateway from the JWT. */
    @Transactional(readOnly = true)
    public List<Organization> listOrgsPendingDeletion() {
        return organizationRepository.findByStatus(OrganizationStatus.PENDING_DELETION);
    }

    /** Super Administrator only - role already checked by the gateway from the JWT. */
    @Transactional
    public Organization approveOrgDeletion(UUID organizationId) {
        Organization organization = requireOrgType(loadExisting(organizationId));
        if (organization.getStatus() != OrganizationStatus.PENDING_DELETION) {
            throw new InvalidOrganizationStateException(
                    "Organization " + organizationId + " is not pending deletion (status=" + organization.getStatus() + ")");
        }
        organization.markDeleted(Instant.now());
        return organization;
    }

    @Transactional
    public StartDeletionResult startIndividualDeletion(UUID actorUserId, UUID organizationId) {
        Organization organization = requireIndividualType(loadExisting(organizationId));
        requireOwner(actorUserId, organization, "start deletion of");
        if (organization.getStatus() != OrganizationStatus.ACTIVE) {
            throw new InvalidOrganizationStateException(
                    "Organization " + organizationId + " is not ACTIVE (status=" + organization.getStatus() + ")");
        }
        UUID token = UUID.randomUUID();
        Instant now = Instant.now();
        Instant expiresAt = now.plus(DELETION_CONFIRMATION_TTL);
        organization.startDeletionConfirmation(token, expiresAt, now);
        return new StartDeletionResult(token, expiresAt);
    }

    @Transactional
    public Organization confirmIndividualDeletion(UUID actorUserId, UUID organizationId, UUID confirmationToken) {
        Organization organization = requireIndividualType(loadExisting(organizationId));
        requireOwner(actorUserId, organization, "confirm deletion of");
        if (!organization.matchesPendingConfirmation(confirmationToken, Instant.now())) {
            throw new InvalidDeletionConfirmationException(
                    "Deletion confirmation token is missing, wrong, or expired for organization " + organizationId);
        }
        organization.markDeleted(Instant.now());
        return organization;
    }

    // -- access control -------------------------------------------------------------------

    /** ORG: any member (ADMINISTRATOR or MEMBER) can view - see requireEditAccess for the narrower, admin-only set of actions. */
    private void requireViewAccess(UUID actorUserId, Organization organization) {
        if (organization.isIndividual()) {
            requireOwner(actorUserId, organization, "view");
        } else {
            requireMembership(actorUserId, organization, "view");
        }
    }

    private void requireMembership(UUID actorUserId, Organization organization, String action) {
        boolean isMember = membershipRepository.findByOrganizationIdAndUserId(organization.getId(), actorUserId).isPresent();
        if (!isMember) {
            throw new OrganizationPermissionDeniedException(actorUserId, organization.getId(), action);
        }
    }

    private void requireEditAccess(UUID actorUserId, Organization organization) {
        if (organization.isIndividual()) {
            requireOwner(actorUserId, organization, "edit");
        } else {
            requireAdministrator(actorUserId, organization, "edit");
        }
    }

    private void requireOwner(UUID actorUserId, Organization organization, String action) {
        if (!organization.getOwnerUserId().equals(actorUserId)) {
            throw new OrganizationPermissionDeniedException(actorUserId, organization.getId(), action);
        }
    }

    private void requireAdministrator(UUID actorUserId, Organization organization, String action) {
        boolean isAdmin = membershipRepository.existsByOrganizationIdAndUserIdAndRole(
                organization.getId(), actorUserId, MembershipRole.ADMINISTRATOR);
        if (!isAdmin) {
            throw new OrganizationPermissionDeniedException(actorUserId, organization.getId(), action);
        }
    }

    // -- loading helpers --------------------------------------------------------------------

    private Organization loadExisting(UUID organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
    }

    private static Organization requireOrgType(Organization organization) {
        if (organization.isIndividual()) {
            throw new InvalidOrganizationStateException(
                    "Action only applies to ORG organizations: " + organization.getId());
        }
        return organization;
    }

    private static Organization requireIndividualType(Organization organization) {
        if (!organization.isIndividual()) {
            throw new InvalidOrganizationStateException(
                    "Action only applies to IND organizations: " + organization.getId());
        }
        return organization;
    }

    public record StartDeletionResult(UUID confirmationToken, Instant expiresAt) {
    }

    public record OrganizationWithRole(Organization organization, MembershipRole role) {
    }
}
