package com.supportme.apigateway.controller;

import io.grpc.StatusRuntimeException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Translates gRPC statuses raised by any organization-service call into HTTP responses, so
 * every controller can call its blocking stub directly without repeating a try/catch.
 */
@RestControllerAdvice(basePackages = "com.supportme.apigateway.controller")
class GrpcExceptionHandler {

    @ExceptionHandler(StatusRuntimeException.class)
    ProblemDetail handleGrpcStatus(StatusRuntimeException e) {
        HttpStatus httpStatus = switch (e.getStatus().getCode()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case ALREADY_EXISTS -> HttpStatus.CONFLICT;
            case FAILED_PRECONDITION -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_GATEWAY;
        };
        String detail = e.getStatus().getDescription() != null ? e.getStatus().getDescription() : e.getMessage();
        return ProblemDetail.forStatusAndDetail(httpStatus, detail);
    }
}
