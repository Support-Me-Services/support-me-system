package com.supportme.organization.service;

import com.supportme.organization.domain.MembershipRole;
import com.supportme.organization.domain.Organization;
import com.supportme.organization.domain.OrganizationMembership;
import com.supportme.organization.domain.OrganizationMembershipRepository;
import com.supportme.organization.domain.OrganizationRepository;
import com.supportme.organization.domain.OrganizationStatus;
import com.supportme.organization.domain.OrganizationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for the SCRUM-183 business rules: IND/ORG creation invariants, permissions, and both deletion workflows. */
class OrganizationServiceTest {

    private final OrganizationRepository organizationRepository = mock(OrganizationRepository.class);
    private final OrganizationMembershipRepository membershipRepository = mock(OrganizationMembershipRepository.class);
    private final AboutContentSanitizer sanitizer = new AboutContentSanitizer();

    private OrganizationService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationService(organizationRepository, membershipRepository, sanitizer);
        when(organizationRepository.saveAndFlush(any(Organization.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createIndividual_rejectsSecondActiveIndForSameOwner() {
        UUID owner = UUID.randomUUID();
        when(organizationRepository.existsByOwnerUserIdAndTypeAndStatusNot(owner, OrganizationType.IND, OrganizationStatus.DELETED))
                .thenReturn(true);

        assertThatThrownBy(() -> service.createIndividual(owner, "Jan", "Kowalski"))
                .isInstanceOf(DuplicateIndividualOrganizationException.class);
    }

    @Test
    void createIndividual_slugIsLastNameFirstName() {
        UUID owner = UUID.randomUUID();
        when(organizationRepository.existsBySlugAndType(anyString(), eq(OrganizationType.IND))).thenReturn(false);

        Organization organization = service.createIndividual(owner, "Jan", "Kowalski");

        assertThat(organization.getSlug()).isEqualTo("kowalski-jan");
        assertThat(organization.getType()).isEqualTo(OrganizationType.IND);
        assertThat(organization.getOwnerUserId()).isEqualTo(owner);
    }

    @Test
    void createIndividual_appendsSuffixWhenSlugTaken() {
        UUID owner = UUID.randomUUID();
        when(organizationRepository.existsBySlugAndType("kowalski-jan", OrganizationType.IND)).thenReturn(true);
        when(organizationRepository.existsBySlugAndType("kowalski-jan-2", OrganizationType.IND)).thenReturn(false);

        Organization organization = service.createIndividual(owner, "Jan", "Kowalski");

        assertThat(organization.getSlug()).isEqualTo("kowalski-jan-2");
    }

    @Test
    void createOrg_addsCreatorAsAdministrator() {
        UUID owner = UUID.randomUUID();
        when(organizationRepository.existsByCategorySlugAndSlugAndType(anyString(), anyString(), eq(OrganizationType.ORG)))
                .thenReturn(false);

        Organization organization = service.createOrg(owner, "Acme Foundation", "Fundacja");

        assertThat(organization.getCategorySlug()).isEqualTo("fundacja");
        assertThat(organization.getSlug()).isEqualTo("acme-foundation");

        ArgumentCaptor<OrganizationMembership> captor = ArgumentCaptor.forClass(OrganizationMembership.class);
        verify(membershipRepository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(owner);
        assertThat(captor.getValue().getRole()).isEqualTo(MembershipRole.ADMINISTRATOR);
    }

    @Test
    void requestOrgDeletion_deniedForNonAdministrator() {
        UUID actor = UUID.randomUUID();
        Organization org = Organization.createOrg(UUID.randomUUID(), UUID.randomUUID(), "Acme", "Fundacja", "fundacja", "acme", Instant.now());
        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));
        when(membershipRepository.existsByOrganizationIdAndUserIdAndRole(org.getId(), actor, MembershipRole.ADMINISTRATOR))
                .thenReturn(false);

        assertThatThrownBy(() -> service.requestOrgDeletion(actor, org.getId()))
                .isInstanceOf(OrganizationPermissionDeniedException.class);
    }

    @Test
    void requestOrgDeletion_movesActiveOrgToPendingDeletion() {
        UUID actor = UUID.randomUUID();
        Organization org = Organization.createOrg(UUID.randomUUID(), UUID.randomUUID(), "Acme", "Fundacja", "fundacja", "acme", Instant.now());
        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));
        when(membershipRepository.existsByOrganizationIdAndUserIdAndRole(org.getId(), actor, MembershipRole.ADMINISTRATOR))
                .thenReturn(true);

        Organization result = service.requestOrgDeletion(actor, org.getId());

        assertThat(result.getStatus()).isEqualTo(OrganizationStatus.PENDING_DELETION);
        assertThat(result.getDeletionRequestedBy()).isEqualTo(actor);
    }

    @Test
    void requestOrgDeletion_rejectsIndividualOrganizations() {
        UUID actor = UUID.randomUUID();
        Organization ind = Organization.createIndividual(UUID.randomUUID(), actor, "Jan", "Kowalski", "kowalski-jan", Instant.now());
        when(organizationRepository.findById(ind.getId())).thenReturn(Optional.of(ind));

        assertThatThrownBy(() -> service.requestOrgDeletion(actor, ind.getId()))
                .isInstanceOf(InvalidOrganizationStateException.class);
        verify(membershipRepository, never()).existsByOrganizationIdAndUserIdAndRole(any(), any(), any());
    }

    @Test
    void approveOrgDeletion_rejectsWhenNotPending() {
        Organization org = Organization.createOrg(UUID.randomUUID(), UUID.randomUUID(), "Acme", "Fundacja", "fundacja", "acme", Instant.now());
        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));

        assertThatThrownBy(() -> service.approveOrgDeletion(org.getId()))
                .isInstanceOf(InvalidOrganizationStateException.class);
    }

    @Test
    void approveOrgDeletion_marksPendingOrgAsDeleted() {
        UUID actor = UUID.randomUUID();
        Organization org = Organization.createOrg(UUID.randomUUID(), UUID.randomUUID(), "Acme", "Fundacja", "fundacja", "acme", Instant.now());
        org.markPendingDeletion(actor, Instant.now());
        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));

        Organization result = service.approveOrgDeletion(org.getId());

        assertThat(result.getStatus()).isEqualTo(OrganizationStatus.DELETED);
        assertThat(result.getDeletedAt()).isNotNull();
    }

    @Test
    void individualDeletion_requiresMatchingUnexpiredToken() {
        UUID owner = UUID.randomUUID();
        Organization ind = Organization.createIndividual(UUID.randomUUID(), owner, "Jan", "Kowalski", "kowalski-jan", Instant.now());
        when(organizationRepository.findById(ind.getId())).thenReturn(Optional.of(ind));

        OrganizationService.StartDeletionResult started = service.startIndividualDeletion(owner, ind.getId());

        assertThatThrownBy(() -> service.confirmIndividualDeletion(owner, ind.getId(), UUID.randomUUID()))
                .isInstanceOf(InvalidDeletionConfirmationException.class);

        Organization result = service.confirmIndividualDeletion(owner, ind.getId(), started.confirmationToken());
        assertThat(result.getStatus()).isEqualTo(OrganizationStatus.DELETED);
    }

    @Test
    void individualDeletion_deniedForNonOwner() {
        UUID owner = UUID.randomUUID();
        UUID intruder = UUID.randomUUID();
        Organization ind = Organization.createIndividual(UUID.randomUUID(), owner, "Jan", "Kowalski", "kowalski-jan", Instant.now());
        when(organizationRepository.findById(ind.getId())).thenReturn(Optional.of(ind));

        assertThatThrownBy(() -> service.startIndividualDeletion(intruder, ind.getId()))
                .isInstanceOf(OrganizationPermissionDeniedException.class);
    }

    @Test
    void updateAboutPage_sanitizesScriptTags() {
        UUID owner = UUID.randomUUID();
        Organization ind = Organization.createIndividual(UUID.randomUUID(), owner, "Jan", "Kowalski", "kowalski-jan", Instant.now());
        when(organizationRepository.findById(ind.getId())).thenReturn(Optional.of(ind));

        Organization result = service.updateAboutPage(owner, ind.getId(), "<p>Hello</p><script>alert(1)</script>");

        assertThat(result.getAboutContent()).contains("Hello").doesNotContain("<script>");
    }

    @Test
    void listMine_combinesOwnedIndAndAdministeredOrgs() {
        UUID actor = UUID.randomUUID();
        Organization ind = Organization.createIndividual(UUID.randomUUID(), actor, "Jan", "Kowalski", "kowalski-jan", Instant.now());
        Organization org = Organization.createOrg(UUID.randomUUID(), UUID.randomUUID(), "Acme", "Fundacja", "fundacja", "acme", Instant.now());
        OrganizationMembership membership = new OrganizationMembership(UUID.randomUUID(), org.getId(), actor, MembershipRole.ADMINISTRATOR, Instant.now());

        when(organizationRepository.findByOwnerUserIdAndTypeAndStatusNot(actor, OrganizationType.IND, OrganizationStatus.DELETED))
                .thenReturn(List.of(ind));
        when(membershipRepository.findByUserId(actor)).thenReturn(List.of(membership));
        when(organizationRepository.findById(org.getId())).thenReturn(Optional.of(org));

        List<Organization> result = service.listMine(actor);

        assertThat(result).containsExactlyInAnyOrder(ind, org);
    }
}
