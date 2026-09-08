package com.supportme.initialization.grpc;

import com.google.protobuf.Timestamp;
import com.supportme.initialization.domain.InitializationToken;
import com.supportme.initialization.domain.InitializationTokenRepository;
import com.supportme.proto.initialization.v1.CreateInitializationTokenRequest;
import com.supportme.proto.initialization.v1.InitializationServiceGrpc;
import com.supportme.proto.initialization.v1.CreateInitializationTokenResponse;
import com.supportme.proto.initialization.v1.InitializationTokenType;
import io.grpc.stub.StreamObserver;
// TODO: verify the exact annotation package/name for registering a gRPC service bean with
// Spring gRPC's server auto-configuration (expected: org.springframework.grpc.server.service.GrpcService)
// against https://github.com/spring-projects/spring-grpc — this is NOT net.devh's annotation.
import org.springframework.grpc.server.service.GrpcService;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Blocking gRPC service implementation, served on virtual threads (Spring gRPC + Spring MVC
 * blocking model, no WebFlux/reactive-grpc per architecture decision).
 */
@GrpcService
public class InitializationGrpcService extends InitializationServiceGrpc.InitializationServiceImplBase {

    // Placeholder default TTL for the skeleton example - not a real business rule.
    private static final Duration DEFAULT_TTL = Duration.ofDays(7);

    private final InitializationTokenRepository initializationTokenRepository;

    public InitializationGrpcService(InitializationTokenRepository initializationTokenRepository) {
        this.initializationTokenRepository = initializationTokenRepository;
    }

    @Override
    public void createInitializationToken(CreateInitializationTokenRequest request,
                                           StreamObserver<CreateInitializationTokenResponse> responseObserver) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(DEFAULT_TTL);

        InitializationToken token = new InitializationToken(
                UUID.randomUUID(),
                toDomainType(request.getType()),
                request.getTargetUrl(),
                expiresAt,
                now);

        initializationTokenRepository.save(token);

        CreateInitializationTokenResponse response = CreateInitializationTokenResponse.newBuilder()
                .setId(token.getId().toString())
                .setType(request.getType())
                .setTargetUrl(token.getTargetUrl())
                .setExpiresAt(toTimestamp(token.getExpiresAt()))
                .setCreatedAt(toTimestamp(token.getCreatedAt()))
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    private static InitializationToken.Type toDomainType(InitializationTokenType type) {
        return switch (type) {
            case INITIALIZATION_TOKEN_TYPE_QR -> InitializationToken.Type.QR;
            case INITIALIZATION_TOKEN_TYPE_NFC -> InitializationToken.Type.NFC;
            case INITIALIZATION_TOKEN_TYPE_EMAIL_LINK -> InitializationToken.Type.EMAIL_LINK;
            case INITIALIZATION_TOKEN_TYPE_SMS_LINK -> InitializationToken.Type.SMS_LINK;
            default -> throw new IllegalArgumentException("Unsupported initialization token type: " + type);
        };
    }

    private static Timestamp toTimestamp(Instant instant) {
        return Timestamp.newBuilder()
                .setSeconds(instant.getEpochSecond())
                .setNanos(instant.getNano())
                .build();
    }
}
