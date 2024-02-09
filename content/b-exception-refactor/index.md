---
emoji: ☁️
title: GlobalExceptionHandler 리팩토링
date: '2024-02-10 00:00:00'
author: 유희진
tags: Backend
categories: Backend
---

## 기존 코드

기존 코드의 경우 Handler에 너무 많은 책임이 있었고, 통일되지 않아 지저분한 느낌이 들었다.

```java
package org.devridge.api.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.IOException;

@RestControllerAdvice
public class FileExceptionHandler {

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Void> handleIoException() {
        return ResponseEntity.internalServerError().build();
    }
}
```

```java
package org.devridge.api.exception;

import org.devridge.api.exception.member.*;
import org.devridge.common.dto.BaseErrorResponse;
import org.devridge.common.dto.BaseResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import javax.persistence.EntityNotFoundException;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<BaseResponse> handleException(NoSuchElementException e) {
        return ResponseEntity.badRequest().build();
    }

    @ExceptionHandler(PasswordNotMatchException.class)
    public ResponseEntity<BaseErrorResponse> handleException(PasswordNotMatchException e) {
        BaseErrorResponse response = new BaseErrorResponse("password does not match.");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(SkillsNotValidException.class)
    public ResponseEntity<BaseErrorResponse> handleException(SkillsNotValidException e) {
        BaseErrorResponse response = new BaseErrorResponse("skills not valid.");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(WeakPasswordException.class)
    public ResponseEntity<BaseErrorResponse> handleException(WeakPasswordException e) {
        BaseErrorResponse response = new BaseErrorResponse("weak password.");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplEmailException.class)
    public ResponseEntity<BaseErrorResponse> handleException(DuplEmailException e) {
        BaseErrorResponse response = new BaseErrorResponse("email already exists.");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(DuplNicknameException.class)
    public ResponseEntity<BaseErrorResponse> handleException(DuplNicknameException e) {
        BaseErrorResponse response = new BaseErrorResponse("nickname already exists.");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<BaseErrorResponse> handleException(MemberNotFoundException e) {
        BaseErrorResponse response = new BaseErrorResponse("member not found");
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<BaseErrorResponse> handleEntityNotFoundException(EntityNotFoundException e) {
        BaseErrorResponse response = new BaseErrorResponse("해당 엔티티를 찾을 수 없습니다.");
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<BaseErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        BaseErrorResponse response = new BaseErrorResponse("이미 존재하는 데이터입니다.");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<BaseErrorResponse> handleAccessDeniedException(AccessDeniedException e) {
        BaseErrorResponse response = new BaseErrorResponse(e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(AccessTokenInvalidException.class)
    public ResponseEntity<BaseErrorResponse> handleAccessDeniedException(AccessTokenInvalidException e) {
        BaseErrorResponse response = new BaseErrorResponse(e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }
}
```

```java
package org.devridge.api.exception;

import org.devridge.common.dto.BaseErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.toList());

        String errorMessage = String.join(" ", errors);
        BaseErrorResponse response = new BaseErrorResponse(errorMessage);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }
}
```

<aside>
❓ 위 방식의 단점?

</aside>

- 위 코드만 봐도 알 수 있듯이 **크기가 클수록 코드의 양이 길어지고 통일성이 사라진다.**
- **모든 예외를 전부 처리**해야하기 때문에 코드의 양이 길어지며, 확장성 역시 떨어진다.

## 코드 리팩토링

모든 `RuntimeException`을 처리하는 `BaseException`을 하나 생성한다.

```java
package org.devridge.api.exception.common;

import lombok.Getter;

@Getter
public class BaseException extends RuntimeException {

    int code;

    public BaseException(int code, String message) {
        super(message);
        this.code = code;
    }
}
```

해당 `BaseException`을 처리하는 `GlobalExceptionHandler`를 생성한다.

```java
package org.devridge.api.exception;

import org.devridge.api.exception.common.BaseException;
import org.devridge.common.dto.BaseErrorResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * developer custom exception
     */
    @ExceptionHandler(BaseException.class)
    public ResponseEntity<BaseErrorResponse> handleBaseException(BaseException exception) {
        return ResponseEntity
            .status(exception.getCode())
            .body(new BaseErrorResponse(exception.getMessage()));
    }

    /**
     * request valid exception
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseErrorResponse> handleRequestValidException(MethodArgumentNotValidException exception) {
        List<String> errors = exception.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.toList());

        String errorMessage = String.join(" ", errors);

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(new BaseErrorResponse(errorMessage));
    }

    /**
     * enum validate exception
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<BaseErrorResponse> handleIllegalArgumentException(IllegalArgumentException exception) {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(new BaseErrorResponse(exception.getMessage()));
    }
}
```

- 위 코드를 통해 필요한 에러만 핸들링하도록 수정함으로써 재사용성을 높였다.

모든 예외처리 클래스가 `BaseException`을 상속받도록 하면, 어디서든 `statusCode`와 `message`를 받을 수 있다.

```java
package org.devridge.api.domain.emailverification.exception;

import org.devridge.api.exception.common.BaseException;

public class EmailVerificationInvalidException extends BaseException {

    public EmailVerificationInvalidException(int code, String message) {
        super(code, message);
    }
}
```

```java
EmailVerification emailVerification = emailVerificationRepository
     .findTopByReceiptEmailOrderByCreatedAtDesc(email)
     .orElseThrow(() -> new EmailVerificationInvalidException(404, "해당 데이터를 찾을 수 없습니다."));
```

위와 같이 처리함으로써 예외처리 코드 및 응답의 통일성, 확장성, `GlobalExceptionHandler`의 코드 크기를 줄일 수 있다.

향후 새로운 커스텀 오류를 처리하고 싶은 경우 `BaseException`을 상속받아 생성하고, 위 예시와 같이 사용하면 된다.

## 참고 자료

[상속을 활용한 Global Exception Handler 리팩토링](https://starting-coding.tistory.com/m/660)
