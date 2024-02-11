---
emoji: ☁️
title: 무한 스크롤 기능 구현하기 (with No Offset)
date: '2024-02-11 00:00:00'
author: 유희진
tags: Backend
categories: Backend
---

## OFFSET 방식의 페이지 처리 문제점

- 일반적인 페이지네이션 방식은 아래와 같다.
    1. `LIMIT` 와 `OFFSET` 명령어를 이용하면 `OFFSET`(어디부터) LIMIT(몇개의) 데이터를 불러올지 결정한다.
    2. 이를 이용해 `OFFSET`을 페이지 번호로 활용한다. (offset = page size * page number)
- OFFSET의 경우 앞에서 읽었던 행을 다시 읽기 때문에, 페이지 번호가 뒤로 갈수록 더욱 느려진다는 문제점이 있다.
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/95fb2aa8-b1c8-47ac-afd6-bde431f31058)

    https://jojoldu.tistory.com/528
    
    - 만약 OFFSET이 1000이고, LIMIT이 10일 경우, 1,000부터 10개를 읽어야 하기 때문에 1,010개의 데이터를 읽는다.
    - 즉, 뒤로 갈수록 버려야하지만 읽어야 할 데이터가 많기 때문에 느려지는 것이다.

## No OFFSET 페이지네이션

- 위 쿼리처럼 `OFFSET`을 사용하지 않고 페이지네이션을 수행한다는 의미이다.
- 조회 시작 부분을 인덱스로 빠르게 찾아 첫 페이지만 읽도록 하는 방식이다.

## No OFFSET으로 무한 스크롤 구현하기

### 구현 시 고려했던 상황

- id가 클수록 최신순이다. (Auto Increment)
- id는 PK로 이미 인덱스가 걸려있기 때문에 다음과 같은 편리함이 있었다.
    - `ASC`의 경우 `ORDER BY`를 할 필요가 없다. (하지만 이 부분은 추가 수정 시 필요가 없었다..^_^)
    - 별도로 createdAt으로 인덱스를 걸 필요가 없었다.

### 1차 코드

1. 마지막 아이템의 PK값을 컨트롤러에서 파라미터로 받는다.
    
    ```java
    @GetMapping
    public ResponseEntity<List<GetAllQnAResponse>> getAllQnA(
        @RequestParam(value = "sortOption", required = true)
        @ValidateSortOption(enumClass = SortOption.class) SortOption sortOption,
        @RequestParam(value = "lastIndex", required = false) Long lastIndex
    ) {
        List<GetAllQnAResponse> result = qnaService.getAllQnASort(sortOption.toString(), lastIndex);
        return ResponseEntity.ok().body(result);
    }
    ```
    
2. Service 코드를 아래와 같이 수정한다.
    
    ```java
    @Transactional(readOnly = true)
    public List<GetAllQnAResponse> getAllQnASort(String sortOption, Long lastIndex) {
        // TODO: 추후 24시 기준으로 업데이트
        if (sortOption.equals("views")) {
            return qnaQuerydslRepository.findAllQnASortByViews();
        }
    
        if (lastIndex == null) {
            throw new LastIndexNotFoundException();
        }
    
        return qnaQuerydslRepository.findAllQnASortByLatest(lastIndex);
    }
    ```
    
3. QueryDsl을 아래와 같이 수정한다.
    
    ```java
    /**
     * 최신순 무한 스크롤
     */
    public List<GetAllQnAResponse> findAllQnASortByLatest(Long lastIndex) {
        return jpaQueryFactory
            .select(
                Projections.constructor(
                    GetAllQnAResponse.class,
                    qQnA.id,
                    qQnA.title,
                    qQnA.likes,
                    qQnA.views,
                    qQnA.comments.size(),
                    qQnA.createdAt
                )
            )
            .from(qQnA)
            .where(qQnA.id.gt(lastIndex))
            .limit(10)
            .fetch();
    }
    ```
    
    - 마지막으로 받아온 lastIndex보다 큰 값을 10개까지만 가져온다.
    - 요청 시 1, 10, 20, 30 으로 lastIndex를 맞추면 될 것이라 생각했다.

위 코드의 결과는 아래와 같다.

```json
POST /api/qna?sortOption=latest&lastIndex=150

[
    {
        "id": 151,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 3,
        "commentCount": 0,
        "createdAt": "2024-01-23T20:57:01"
    },
    {
        "id": 152,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 1,
        "commentCount": 0,
        "createdAt": "2024-01-23T21:01:57"
    },
    {
        "id": 153,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 1,
        "commentCount": 0,
        "createdAt": "2024-01-24T10:58:35"
    },
    {
        "id": 154,
        "title": "xxxxxxxxxxxxxx",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-26T15:23:32"
    },
    {
        "id": 155,
        "title": "xxxxxxxxxxxxxx",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-26T16:38:18"
    },
    {
        "id": 156,
        "title": "코딩이 정말 재미있네요",
        "likes": 0,
        "views": 2,
        "commentCount": 0,
        "createdAt": "2024-01-28T01:32:30"
    },
    {
        "id": 157,
        "title": "낮잠을 너무 많이 잤어요 ㅋㅋㅋㅋㅋㅋ",
        "likes": 0,
        "views": 5,
        "commentCount": 1,
        "createdAt": "2024-02-08T19:15:49"
    },
    {
        "id": 158,
        "title": "감자튀김 먹고싶어요....",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-08T20:21:42"
    },
    {
        "id": 159,
        "title": "감자튀김 먹고싶어요....",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-08T20:24:11"
    },
    {
        "id": 160,
        "title": "감자튀김 먹고싶어요....",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-08T20:24:50"
    }
]
```

- id순으로 정렬되어 응답이 이루어지긴 했지만 최신순으로 응답이 온 것은 아니었다.

### 2차 수정

```java
/**
 * 최신순 무한 스크롤
 */
public List<GetAllQnAResponse> findAllQnASortByLatest(Long lastIndex) {
    return jpaQueryFactory
        .select(
            Projections.constructor(
                GetAllQnAResponse.class,
                qQnA.id,
                qQnA.title,
                qQnA.likes,
                qQnA.views,
                qQnA.comments.size(),
                qQnA.createdAt
            )
        )
        .from(qQnA)
        .where(qQnA.id.gt(lastIndex))
        .orderBy(qQnA.id.desc())
        .limit(10)
        .fetch();
}
```

- `orderBy(id.desc())`를 추가로 걸어두어 가장 큰 아이디(최신 insert된 게시물) 순서로 정렬되어 10개씩 가져오도록 했다.

위 코드의 결과는 아래와 같다.

```json
POST /api/qna?sortOption=latest&lastIndex=150

[
    {
        "id": 184,
        "title": "새해복 많이 받으세요",
        "likes": 0,
        "views": 0,
        "commentCount": 2,
        "createdAt": "2024-02-10T02:04:26"
    },
    {
        "id": 183,
        "title": "asdfasdf",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:29:01"
    },
    {
        "id": 182,
        "title": "ㅎㅇㅁㄴㅇㅎ",
        "likes": 0,
        "views": 0,
        "commentCount": 10,
        "createdAt": "2024-02-09T22:16:26"
    },
    {
        "id": 181,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:08"
    },
    {
        "id": 180,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:08"
    },
    {
        "id": 179,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:07"
    },
    {
        "id": 178,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:07"
    },
    {
        "id": 177,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:07"
    },
    {
        "id": 176,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:07"
    },
    {
        "id": 175,
        "title": "안녕하세요",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-02-09T22:10:06"
    }
]
```

- lastIndex가 어떤 값이든 항상 같은 값을 반환한다.
- lastIndex보다 큰 값이면 상관없었기 때문에 `ORDER BY DESC`로 인해 가장 큰 ID부터 불러왔기 때문이다.

### 3차 수정

```java
/**
 * 최신순 무한 스크롤
 */
public List<GetAllQnAResponse> findAllQnASortByLatest(Long lastIndex) {
    return jpaQueryFactory
        .select(
            Projections.constructor(
                GetAllQnAResponse.class,
                qQnA.id,
                qQnA.title,
                qQnA.likes,
                qQnA.views,
                qQnA.comments.size(),
                qQnA.createdAt
            )
        )
        .from(qQnA)
        .where(qQnA.id.loe(lastIndex))
        .orderBy(qQnA.id.desc())
        .limit(10)
        .fetch();
}
```

- lastIndex 10, 20, 30, … 으로 받아오도록 설정했다.
- `ORDER BY DESC`로 정렬한 후, lastIndex보다 작거나 같은 index 값을 가진 게시물을 10개까지만 가져온다.

위 코드의 결과는 아래와 같다.

```json
POST /api/qna?sortOption=latest&lastIndex=150

[
    {
        "id": 150,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 1,
        "commentCount": 0,
        "createdAt": "2024-01-23T20:55:59"
    },
    {
        "id": 149,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-23T20:51:59"
    },
    {
        "id": 148,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-23T20:51:53"
    },
    {
        "id": 147,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 1,
        "commentCount": 0,
        "createdAt": "2024-01-23T20:49:36"
    },
    {
        "id": 146,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-23T20:48:32"
    },
    {
        "id": 145,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-23T12:17:36"
    },
    {
        "id": 142,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 3,
        "views": 1,
        "commentCount": 2,
        "createdAt": "2024-01-21T21:32:29"
    },
    {
        "id": 141,
        "title": "Java 17 버전에서 QueryDsl 설정 방법",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-20T20:38:57"
    },
    {
        "id": 140,
        "title": "고구마 피자가 웬말이냐",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-19T20:44:54"
    },
    {
        "id": 139,
        "title": "고구마 피자가 웬말이냐",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-19T20:11:48"
    }
]
```

최신순으로 잘 정렬된 것을 볼 수 있다.

## 참고 자료

- https://thalals.tistory.com/350
- https://jojoldu.tistory.com/528
