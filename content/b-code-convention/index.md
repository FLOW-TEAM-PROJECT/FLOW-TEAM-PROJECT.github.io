---
emoji: 📝
title: Backend Code Convention
date: '2023-12-26 00:00:00'
author: 유희진
tags: Backend Convention
categories: Backend Convention
---
## Version Guide
- java version: v11

## Code Style Guide
- 코드의 `width`는 **최대 120자를 넘지 않도록 합니다.**
- **하나의 메소드는 하나의 역할만 수행**하도록 작성합니다.
- 메소드의 **매개변수가 4개 이상일 시 별도의 객체를 만들어 전달**합니다.
- 코드 작성 시 스타일은 **카멜 케이스로 작성**해주세요.
- 변수는 명사형으로, 메소드(함수)는 동사형으로 작성해주세요.
- 자주 사용하는 혹은 불변하지 않는 값은 enum이나 final로 선언해주세요.
- **접근 제어, 인터페이스/구현부 분리 등의 캡슐화**를 최대한 지키며 코드를 작성합니다.
- Backend의 경우 **폴더명(패키지)은 소문자로, 파일명은 카멜 케이스로 작성**해주세요.
- Backend의 경우 문자열 작성 시 `“”` 사용해주세요.
- CRUD method의 경우 다음과 같은 네이밍을 사용합니다.
    | 동작 | Repository | Service |
    | --- | --- | --- |
    | Create | insertXXX | createXXX |
    | Read | findXX(ByXXAnd/OrYY) | getXX(ByXXAnd/OrYY) |
    | Update | updateXXX(ByXXAnd/OrYY) | updateXXX(ByXXAnd/OrYY) |
    | Delete | deleteXXX(ByXXAnd/OrYY) | deleteXXX(ByXXAnd/OrYY) |
    - 일반적으로 DB에서 데이터를 검색할 땐 findXX 형태를 사용하며, 외부 API를 사용할 땐 getXXX 형태를 사용합니다.

## RESTful API Guide

> 기본적으로 **url은 명사형**으로 작성하며, **동작은 Method**로 정의합니다.
> 
- `controller`에서 응답 시 정확한 `status code`를 전달합니다.
    
    
    | Code | Description |
    | --- | --- |
    | 200 | OK: 요청이 성공적으로 처리되었을 때 사용합니다. |
    | 201 | CREATED: 요청이 성공적으로 처리되었으며, 그 결과 새로운 리소스가 생성되었을 때 사용합니다. |
    | 400 | BAD REQUEST: Frontend에서 잘못된 요청 혹은 요구되는 data가 빠졌을 시 사용합니다. |
    | 401 | UNAUTHORIZED: 사용자가 인증되지 않아 요청 권한이 없는 경우 사용합니다. |
    | 403 | FORBIDDEN: 사용자가 인증되었으나 해당 리소스에 대한 권한이 없을 경우 사용합니다. |
    | 404 | NOT FOUND: 해당하는 리소스를 찾을 수 없을 경우 사용합니다. |
    | 409 | CONFLICT: 기존 리소스와 충돌하는 경우 사용합니다. (ex. 중복 이메일) |
    | 500 | INTERNAL SERVER ERROR: 기타 알 수 없는 서버 오류 시 사용합니다. |
- `API` 정의 시 올바른 `Method`를 사용합니다.
    
    
    | Method | Description |
    | --- | --- |
    | GET | 리소스 조회 요청 시 사용합니다. |
    | POST | 새로운 리소스 생성 시 사용합니다. |
    | PUT | 리소스 전체 내용을 수정할 때 사용합니다. |
    | PATCH | 리소스 부분 내용을 수정할 때 사용합니다. |
    | DELETE | 리소스 삭제 시 사용합니다. |
- 어떤 **리소스를 식별**하고 싶으면 `Path Variable`, **정렬이나 필터링** 시 `Query Parameter`를 사용합니다.
    
    ```
    /users  # 사용자 목록을 가져온다.
    /users?occupation=programer  # 프로그래머인 사용자 목록을 가져온다.
    /users/123  # 아이디가 123인 사용자를 가져온다.
    ```
    
- url에는 대문자 대신 **소문자를 사용**하며, 언더바 대신 하이픈(-)을 사용하여 **케밥 케이스로 작성**합니다.
- 파일의 확장자는 url에 포함하지 않습니다.
- **API 요청 시 권한 설정을 명확하게 설정**하여 보안을 강화합니다.
- PK id값이 주소에 들어있는 경우 암호화가 필요합니다.
    - [https://hogwart-scholars.tistory.com/entry/Spring-Boot-Auto-Increment-PK-Id를-노출하지-않으면서-API에-활용하는-방법](https://hogwart-scholars.tistory.com/entry/Spring-Boot-Auto-Increment-PK-Id%EB%A5%BC-%EB%85%B8%EC%B6%9C%ED%95%98%EC%A7%80-%EC%95%8A%EC%9C%BC%EB%A9%B4%EC%84%9C-API%EC%97%90-%ED%99%9C%EC%9A%A9%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95)

## SQL Style Guide

- 쿼리문은 다음과 같은 형식으로 작성합니다.
    
    ```sql
    -- 키워드, 문장 등의 경우 항상 다음 새로운 줄에서 시작합니다.
    SELECT col_name 
    FROM table_name
    WHERE colum_name=${condition}
        AND id=${id}
    ORDER BY column_name
    ;
    
    -- 예시
    SELECT BOOK.book_id
        , AUTHOR.author_name
        , DATE_FORMAT(BOOK.published_date, '%Y-%m-%d') AS published_date
    FROM book BOOK
        JOIN author AUTHOR
        ON BOOK.author_id = AUTHOR.author_id
    WHERE
        BOOK.category = '경제'
    ORDER BY
        BOOK.published_date
    ;
    ```
    
    - 예약어, DB alias의 경우 대문자로 작성합니다.
    - alias는 최대한 자세하게 지어주세요.
- DB의 경우 **대소문자 구분이 없기 때문에 스네이크 케이스를 사용**하는 것이 권고사항입니다.
- 기본키 필드의 경우 `id`, 외래키 필드의 이름의 경우 `{참조 테이블명}_id`로 이름을 통일합니다.
    - 단, Application 레이어에서 기본키 필드를 사용할 땐 `{참조 테이블명}Id`로 이름을 사용해주세요.
    - **Application 레이어에서는 카멜 케이스를 사용해야 함을 주의**하세요.

## 참고 사이트

### 우아한 테크코스 문서 저장소

https://github.com/woowacourse/woowacourse-docs

### Backend

- [캠퍼스 핵데이 Java 코딩 컨벤션](https://naver.github.io/hackday-conventions-java/)
- [좋은 코드를 위한 자바 변수명 네이밍](https://tecoble.techcourse.co.kr/post/2020-04-24-variable_naming/)
- [좋은 코드를 위한 자바 메소드 네이밍](https://tecoble.techcourse.co.kr/post/2020-04-26-Method-Naming/)
- [좋은 테스트 코드 작성(Mockito)](https://github.com/mockito/mockito/wiki/How-to-write-good-tests)

### DB

- [MySQL 네이밍 규칙](https://killu.tistory.com/52)
- [SQL 가독성을 높이는 다섯 가지 사소한 습관](https://yozm.wishket.com/magazine/detail/1519/)
- [SQL 스타일 가이드](https://brownbears.tistory.com/595)