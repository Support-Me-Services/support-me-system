package com.supportme.initialization.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InitializationTokenRepository extends JpaRepository<InitializationToken, UUID> {
}
