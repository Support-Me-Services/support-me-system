package com.supportme.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Context-loads smoke test. The issuer-uri points at a placeholder Keycloak URL that does not
 * need to be reachable for the Spring context to start (JWT decoder validation happens lazily,
 * at request time).
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8081/realms/support-me"
})
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
    }
}
