package com.supportme.initialization;

import com.supportme.initialization.domain.InitializationToken;
import com.supportme.initialization.domain.InitializationTokenRepository;
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
// the fixed 9092 from application.yml - integration tests must never bind a
// hardcoded port (confirmed by a real failure: it collided with a port
// Testcontainers/Docker had concurrently in use on the test machine).
@SpringBootTest(properties = "spring.grpc.server.port=0")
class InitializationApplicationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17")
            .withDatabaseName("initialization_db")
            .withUsername("initialization")
            .withPassword("initialization");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private InitializationTokenRepository initializationTokenRepository;

    @Test
    void contextLoads() {
        assertThat(initializationTokenRepository).isNotNull();
    }

    @Test
    void savesAndFindsInitializationToken() {
        Instant now = Instant.now();
        InitializationToken token = new InitializationToken(
                UUID.randomUUID(),
                InitializationToken.Type.QR,
                "https://example.org/join/abc123",
                now.plusSeconds(3600),
                now);

        initializationTokenRepository.save(token);

        Optional<InitializationToken> found = initializationTokenRepository.findById(token.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getType()).isEqualTo(InitializationToken.Type.QR);
    }
}
