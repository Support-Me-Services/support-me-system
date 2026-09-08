package com.supportme.apigateway.config;

import com.supportme.proto.initialization.v1.InitializationServiceGrpc;
import com.supportme.proto.organization.v1.OrganizationServiceGrpc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
// TODO: verify the exact Spring gRPC client API surface (expected package
// org.springframework.grpc.client, e.g. GrpcChannelFactory) against
// https://github.com/spring-projects/spring-grpc — Spring gRPC is young and this shape may
// have changed between milestones. Channel target names ("organization", "initialization")
// below are expected to be configured under spring.grpc.client.channels.* in application.yml.
import org.springframework.grpc.client.GrpcChannelFactory;

/**
 * gRPC client configuration: builds blocking stubs (per architecture decision - blocking
 * stubs + Spring MVC + virtual threads, no reactive-grpc) for the organization and
 * initialization services.
 *
 * For local dev, channels are configured for plaintext (no TLS) - see application.yml. Switch
 * to TLS (and proper credentials) before running this in any shared/production environment.
 */
@Configuration
public class GrpcClientConfig {

    @Bean
    public OrganizationServiceGrpc.OrganizationServiceBlockingStub organizationServiceBlockingStub(
            GrpcChannelFactory channelFactory) {
        return OrganizationServiceGrpc.newBlockingStub(channelFactory.createChannel("organization"));
    }

    @Bean
    public InitializationServiceGrpc.InitializationServiceBlockingStub initializationServiceBlockingStub(
            GrpcChannelFactory channelFactory) {
        return InitializationServiceGrpc.newBlockingStub(channelFactory.createChannel("initialization"));
    }
}
