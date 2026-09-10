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
