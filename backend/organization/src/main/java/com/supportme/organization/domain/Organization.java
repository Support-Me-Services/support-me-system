package com.supportme.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization")
public class Organization {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, updatable = false)
    private OrganizationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OrganizationStatus status;

    @Column(name = "name", nullable = false)
    private String name;

    /** IND only. */
    @Column(name = "first_name")
    private String firstName;

    /** IND only. */
    @Column(name = "last_name")
    private String lastName;

    /** ORG only. */
    @Column(name = "category")
    private String category;

    /** ORG only. */
    @Column(name = "category_slug")
    private String categorySlug;

    /** IND: "nazwisko-imie". ORG: "name-slug", unique within category_slug. */
    @Column(name = "slug", nullable = false, updatable = false)
    private String slug;

    @Column(name = "about_content")
    private String aboutContent;

    /** Contact info panel ("Informacja kontaktowa" in the frontend org-detail screen). */
    @Column(name = "phone_number")
    private String phoneNumber;

    /** Church role shown on the "Wizytówka" page (e.g. Proboszcz, Wikariusz, Kapelan, Diakon). */
    @Column(name = "role")
    private String role;

    @Column(name = "owner_user_id", nullable = false, updatable = false)
    private UUID ownerUserId;

    @Column(name = "deletion_requested_by")
    private UUID deletionRequestedBy;

    @Column(name = "deletion_requested_at")
    private Instant deletionRequestedAt;

    @Column(name = "deletion_confirmation_token")
    private UUID deletionConfirmationToken;

    @Column(name = "deletion_confirmation_expires_at")
    private Instant deletionConfirmationExpiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Organization() {
        // JPA
    }

    public static Organization createIndividual(UUID id, UUID ownerUserId, String firstName, String lastName,
                                                  String slug, Instant now) {
        Organization organization = new Organization();
        organization.id = id;
        organization.type = OrganizationType.IND;
        organization.status = OrganizationStatus.ACTIVE;
        organization.ownerUserId = ownerUserId;
        organization.firstName = firstName;
        organization.lastName = lastName;
        organization.name = firstName + " " + lastName;
        organization.slug = slug;
        organization.createdAt = now;
        organization.updatedAt = now;
        return organization;
    }

    public static Organization createOrg(UUID id, UUID ownerUserId, String name, String category,
                                          String categorySlug, String slug, Instant now) {
        Organization organization = new Organization();
        organization.id = id;
        organization.type = OrganizationType.ORG;
        organization.status = OrganizationStatus.ACTIVE;
        organization.ownerUserId = ownerUserId;
        organization.name = name;
        organization.category = category;
        organization.categorySlug = categorySlug;
        organization.slug = slug;
        organization.createdAt = now;
        organization.updatedAt = now;
        return organization;
    }

    public boolean isIndividual() {
        return type == OrganizationType.IND;
    }

    public boolean isActive() {
        return status == OrganizationStatus.ACTIVE;
    }

    public boolean isPendingDeletion() {
        return status == OrganizationStatus.PENDING_DELETION;
    }

    public void updateAboutContent(String sanitizedHtml, Instant now) {
        this.aboutContent = sanitizedHtml;
        this.updatedAt = now;
    }

    /** ORG only - "Nazwa organizacji" + phone + role, edited from either "Informacja kontaktowa" or "Zarządzanie kontem". */
    public void updateOrgProfile(String name, String phoneNumber, String role, Instant now) {
        this.name = name;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.updatedAt = now;
    }

    /** IND only - "Imię i nazwisko" + phone + role; name is always re-derived from first/last, same as createIndividual. */
    public void updateIndividualProfile(String firstName, String lastName, String phoneNumber, String role, Instant now) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.name = firstName + " " + lastName;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.updatedAt = now;
    }

    public void markPendingDeletion(UUID actorUserId, Instant now) {
        this.status = OrganizationStatus.PENDING_DELETION;
        this.deletionRequestedBy = actorUserId;
        this.deletionRequestedAt = now;
        this.updatedAt = now;
    }

    public void clearPendingDeletion(Instant now) {
        this.status = OrganizationStatus.ACTIVE;
        this.deletionRequestedBy = null;
        this.deletionRequestedAt = null;
        this.updatedAt = now;
    }

    public void markDeleted(Instant now) {
        this.status = OrganizationStatus.DELETED;
        this.deletedAt = now;
        this.updatedAt = now;
        this.deletionConfirmationToken = null;
        this.deletionConfirmationExpiresAt = null;
    }

    public void startDeletionConfirmation(UUID token, Instant expiresAt, Instant now) {
        this.deletionConfirmationToken = token;
        this.deletionConfirmationExpiresAt = expiresAt;
        this.updatedAt = now;
    }

    public boolean matchesPendingConfirmation(UUID token, Instant now) {
        return deletionConfirmationToken != null
                && deletionConfirmationToken.equals(token)
                && deletionConfirmationExpiresAt != null
                && now.isBefore(deletionConfirmationExpiresAt);
    }

    public UUID getId() {
        return id;
    }

    public OrganizationType getType() {
        return type;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    public String getName() {
        return name;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getCategory() {
        return category;
    }

    public String getCategorySlug() {
        return categorySlug;
    }

    public String getSlug() {
        return slug;
    }

    public String getAboutContent() {
        return aboutContent;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getRole() {
        return role;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public UUID getDeletionRequestedBy() {
        return deletionRequestedBy;
    }

    public Instant getDeletionRequestedAt() {
        return deletionRequestedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
