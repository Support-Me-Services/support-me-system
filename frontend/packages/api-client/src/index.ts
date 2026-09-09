export { axiosInstance, default as axios } from "./axios-instance";

// orval's "tags-split" output mode writes one file per tag folder but no
// aggregating root index.ts (confirmed in @orval/core's writeSplitTagsMode),
// so the barrel re-export has to name each generated file explicitly. Keep
// this list in sync with orval.config.ts's tags whenever the OpenAPI spec
// gains/loses a tag.
export * from "./generated/openAPIDefinition.schemas";
export * from "./generated/organizations/organizations";
export * from "./generated/public-organization-pages/public-organization-pages";
export * from "./generated/super-administrator/super-administrator";
