import {
  OrganizationResponseDtoStatus,
  OrganizationResponseDtoType,
  type OrganizationResponseDto,
} from "@support-me/api-client";
import type { BadgeVariant } from "@support-me/ui";

export function typeLabel(type: OrganizationResponseDto["type"]): string {
  return type === OrganizationResponseDtoType.IND ? "Indywidualna" : "Organizacja";
}

export function statusLabel(status: OrganizationResponseDto["status"]): string {
  switch (status) {
    case OrganizationResponseDtoStatus.ACTIVE:
      return "Aktywna";
    case OrganizationResponseDtoStatus.PENDING_DELETION:
      return "Do usunięcia";
    case OrganizationResponseDtoStatus.DELETED:
      return "Usunięta";
    default:
      return status ?? "";
  }
}

export function statusBadgeVariant(status: OrganizationResponseDto["status"]): BadgeVariant {
  switch (status) {
    case OrganizationResponseDtoStatus.ACTIVE:
      return "success";
    case OrganizationResponseDtoStatus.PENDING_DELETION:
      return "warning";
    case OrganizationResponseDtoStatus.DELETED:
      return "danger";
    default:
      return "neutral";
  }
}

/** The guest-facing public URL path for an organization, per SCRUM-183's URL structure. */
export function organizationPublicPath(org: OrganizationResponseDto): string {
  if (org.type === OrganizationResponseDtoType.IND) {
    return `/ind/${org.slug}/about`;
  }
  return `/org/${org.categorySlug}/${org.slug}/about`;
}
