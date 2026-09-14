import { InvitationResponseDtoStatus, type InvitationResponseDto } from "@support-me/api-client";
import type { BadgeVariant } from "@support-me/ui";

export function invitationStatusLabel(status: InvitationResponseDto["status"]): string {
  switch (status) {
    case InvitationResponseDtoStatus.PENDING:
      return "Oczekujące";
    case InvitationResponseDtoStatus.ACCEPTED:
      return "Przyjęte";
    case InvitationResponseDtoStatus.DECLINED:
      return "Odrzucone";
    default:
      return status ?? "";
  }
}

export function invitationStatusBadgeVariant(status: InvitationResponseDto["status"]): BadgeVariant {
  switch (status) {
    case InvitationResponseDtoStatus.PENDING:
      return "warning";
    case InvitationResponseDtoStatus.ACCEPTED:
      return "accent";
    case InvitationResponseDtoStatus.DECLINED:
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Invitations only carry a raw invitedUserId (no email/name on the DTO yet), so this is what
 * a card can honestly show for "who was invited" - a short, unambiguous fragment of the id.
 */
export function shortenUserId(id?: string): string {
  if (!id) return "-";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
