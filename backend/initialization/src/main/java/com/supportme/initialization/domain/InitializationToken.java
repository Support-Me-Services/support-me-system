package com.supportme.initialization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "initialization_token")
public class InitializationToken {

    public enum Type {
        QR,
        NFC,
        EMAIL_LINK,
        SMS_LINK
    }

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private Type type;

    @Column(name = "target_url", nullable = false)
    private String targetUrl;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected InitializationToken() {
        // JPA
    }

    public InitializationToken(UUID id, Type type, String targetUrl, Instant expiresAt, Instant createdAt) {
        this.id = id;
        this.type = type;
        this.targetUrl = targetUrl;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public Type getType() {
        return type;
    }

    public String getTargetUrl() {
        return targetUrl;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
