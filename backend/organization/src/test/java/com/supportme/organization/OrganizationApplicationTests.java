package com.supportme.organization;

import com.supportme.organization.domain.Organization;
import com.supportme.organization.domain.OrganizationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smoke test: Spring context loads against a real Postgres (via Testcontainers) with Liquibase
 * migrations applied, and a basic JPA repository round-trip works.
 */
@Testcontainers
// port=0 binds an OS-assigned ephemeral port for the gRPC server instead of
// the fixed 9091 from application.yml - integration tests must never bind a
// hardcoded port (confirmed by a real failure: it collided with a port
// Testcontainers/Docker had concurrently in use on the test machine).
@SpringBootTest(properties = "spring.grpc.server.port=0")
class OrganizationApplicationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17")
            .withDatabaseName("organization_db")
            .withUsername("organization")
            .withPassword("organization");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrganizationRepository organizationRepository;

    @Test
    void contextLoads() {
        assertThat(organizationRepository).isNotNull();
    }

    @Test
    void savesAndFindsOrganization() {
        Organization organization = new Organization(UUID.randomUUID(), "Test Org", "A test organization", Instant.now());

        organizationRepository.save(organization);

        Optional<Organization> found = organizationRepository.findById(organization.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Test Org");
    }
}
