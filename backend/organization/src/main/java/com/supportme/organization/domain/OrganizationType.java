package com.supportme.organization.domain;

public enum OrganizationType {
    /** Individual organization ("wizytowka" tied directly to one user). At most one active IND per owner. */
    IND,
    /** Company/group organization. A user may own many; the creator becomes its first ADMINISTRATOR. */
    ORG
}
