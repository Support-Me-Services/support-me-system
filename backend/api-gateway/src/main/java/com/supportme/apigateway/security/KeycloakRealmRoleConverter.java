package com.supportme.apigateway.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Keycloak puts realm-level roles (e.g. SUPER_ADMIN) under the non-standard "realm_access.roles"
 * claim, not the "scope"/"scp" claim Spring Security's default JwtGrantedAuthoritiesConverter
 * looks at - so that default converter silently finds nothing and every hasRole(...) check
 * would always deny. This converter reads realm_access.roles instead and maps each role to a
 * "ROLE_"-prefixed authority (e.g. "SUPER_ADMIN" -> "ROLE_SUPER_ADMIN"), matching what
 * hasRole("SUPER_ADMIN") expects.
 */
final class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof List<?> roles)) {
            return List.of();
        }
        return roles.stream()
                .map(String::valueOf)
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT)))
                .map(GrantedAuthority.class::cast)
                .toList();
    }
}
