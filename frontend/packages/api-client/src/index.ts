export { axiosInstance, default as axios } from "./axios-instance";

// orval's "tags-split" output mode (see orval.config.ts) writes one file per OpenAPI tag under
// generated/<tag>/ with no aggregating barrel file - so re-export each tag module by hand here
// instead of the `export * from "./generated"` this replaced (which doesn't resolve to
// anything: there is no generated/index.ts). Add a line here whenever api-gateway's OpenAPI
// spec gains a new tag.
export * from "./generated/openAPIDefinition.schemas";
export * from "./generated/organizations/organizations";
export * from "./generated/public-organization-pages/public-organization-pages";
export * from "./generated/super-administrator/super-administrator";
export * from "./generated/invitations/invitations";
export * from "./generated/users/users";
