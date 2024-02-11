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
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/451cea3e-adbd-474b-9f00-9adcb337a5c3)

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
    public List<GetAllQnAResponse> getAllQnA(String sortOption, Long lastIndex) {
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
    
    - [추가] 댓글 무한 스크롤을 구현하던 중 **처음 요청을 보낼 땐 가장 최근의 게시글 id를 찾아주는 것이 좋을 것** 같아 아래와 같이 수정했다.
        
        ```java
        // Service
        @Transactional(readOnly = true)
        public List<GetAllQnAResponse> getAllQnA(String sortOption, Long lastIndex) {
            // TODO: 추후 24시 기준으로 업데이트
            if (sortOption.equals("views")) {
                return qnaQuerydslRepository.findAllQnASortByViews();
            }
        
            if (lastIndex == null) {
                Long maxId = qnaRepository.findMaxId().orElse(0L);
                return qnaQuerydslRepository.findAllQnASortByLatest(maxId);
            }
        
            return qnaQuerydslRepository.findAllQnASortByLatest(lastIndex);
        }
        
        // Repository
        @Query(
            value = "SELECT MAX(id) " +
                    "FROM QnA"
        )
        Optional<Long> findMaxId();
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
GET /api/qna?sortOption=latest&lastIndex=150

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
...
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
GET /api/qna?sortOption=latest&lastIndex=150

[
    {
        "id": 184,
        "title": "JDK 17과 Spring Boot",
        "likes": 0,
        "views": 0,
        "commentCount": 2,
        "createdAt": "2024-02-10T02:04:26"
    },
    {
        "id": 183,
        "title": "JDK 17과 Spring Boot",
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
...
]
```

- **lastIndex가 어떤 값이든 항상 같은 값을 반환하는 문제가 발생한다.**
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

- lastIndex를 10, 20, 30, … 으로 받아오도록 설정했다.
- `ORDER BY DESC`로 정렬한 후, lastIndex보다 작거나 같은 index 값을 가진 게시물을 10개까지만 가져온다.

위 코드의 결과는 아래와 같다.

```json
GET /api/qna?sortOption=latest&lastIndex=150

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
        "title": "고구마 피자와 감자 피자",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-19T20:44:54"
    },
    {
        "id": 139,
        "title": "고구마 피자와 감자 피자",
        "likes": 0,
        "views": 0,
        "commentCount": 0,
        "createdAt": "2024-01-19T20:11:48"
    }
]
```

최신순으로 잘 정렬된 것을 볼 수 있다.

## [추가] 댓글 무한 스크롤 구현하기

- 댓글의 경우 **해당 Q&A에 있는 댓글들을 불러와야 하기 때문에 id로 순차 정렬하여 가져올 수 없다.**
- 이 경우 Q&A처럼 lastIndex를 받아오면 원하는 값을 불러오기 어려울 것이다.

### 고려 사항

1. Q&A를 넘겨줄 때 가장 큰 commentId를 기준으로 댓글 10개를 불러온다.
2. 이후 스크롤 시 가장 작은 id를 기준으로 재요청하도록 한다.

### 1차 구현

1. 처음 요청을 보낼 땐 해당 게시글 댓글의 최대 id값을 알 수 없기 때문에 lastIndex를 보내지 않는다.
2. 위와 같이 처리했을 때 lastIndex가 없는 경우 자동으로 가장 큰 아이디 값을 찾아주도록 코드를 작성했다.
    
    ```java
    public List<GetAllCommentByQnAId> getAllQnACommentByQnAId(Long lastIndex, Long qnaId) {
    	QnA qna = getQnA(qnaId);
    	
    	if (lastIndex == null) {
    	    // TODO: 해당 게시글에 댓글이 없는 경우 확인
    	    Long lastIndexByQnAId = qnaCommentRepository.findMaxIdByQnAId(qnaId);
    	    return qnaQuerydslRepository.findAllQnAComment(lastIndexByQnAId, qnaId);
    	}
    	
    	// TODO: 탈퇴된 멤버 처리 확인
    	return qnaQuerydslRepository.findAllQnAComment(lastIndex, qnaId);
    }
    ```
    

결과는 아래와 같다.

1. 댓글이 있는 경우
    
    ```json
    GET /api/qna/162/comments
    
    [
        {
            "id": 180,
            "member": {
                "id": 188,
                "nickname": "닉네임304",
                "profileImageUrl": "http://abc.abc",
                "introduction": "성장하는 개발자입니다."
            },
            "content": "안녕하세요",
            "likes": 0,
            "dislikes": 0,
            "createdAt": "2024-02-11T22:00:18"
        },
        {
            "id": 179,
            "member": {
                "id": 188,
                "nickname": "닉네임304",
                "profileImageUrl": "http://abc.abc",
                "introduction": "성장하는 개발자입니다."
            },
            "content": "안녕하세요",
            "likes": 0,
            "dislikes": 0,
            "createdAt": "2024-02-11T22:00:17"
        },
        {
            "id": 178,
            "member": {
                "id": 188,
                "nickname": "닉네임304",
                "profileImageUrl": "http://abc.abc",
                "introduction": "성장하는 개발자입니다."
            },
            "content": "안녕하세요",
            "likes": 0,
            "dislikes": 0,
            "createdAt": "2024-02-11T22:00:16"
        },
    ...
    ]
    ```
    
    ```json
    GET /api/qna/162/comments?lastIndex=171
    
    [
        {
            "id": 171,
            "member": {
                "id": 188,
                "nickname": "닉네임304",
                "profileImageUrl": "http://abc.abc",
                "introduction": "성장하는 개발자입니다."
            },
            "content": "안녕하세요",
            "likes": 0,
            "dislikes": 0,
            "createdAt": "2024-02-11T22:00:08"
        },
        {
            "id": 143,
            "member": {
                "id": 188,
                "nickname": "닉네임304",
                "profileImageUrl": "http://abc.abc",
                "introduction": "성장하는 개발자입니다."
            },
            "content": "감사합니다",
            "likes": 0,
            "dislikes": 0,
            "createdAt": "2024-02-08T23:57:59"
        }
    ]
    ```
    

그러나…**댓글이 없는 게시글인 경우에는 500 에러가 발생한다…!**

### 2차 수정

- 500오류의 원인은 단순 NPE 문제였다.
    
    ```json
    ERROR 2024-02-11 23:43:10[http-nio-8080-exec-5] [[dispatcherServlet]:175] - Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.NullPointerException] with root cause
    java.lang.NullPointerException: null
    ```
    
    - comment가 없는 경우 maxId의 결과값이 null이기 때문에 발생한 문제인 듯 했다.
- 아래와 같이 코드를 수정하면 댓글이 없는 경우 빈 배열을 반환한다.
    
    ```java
    // Service 로직
    public List<GetAllCommentByQnAId> getAllQnACommentByQnAId(Long lastIndex, Long qnaId) {
        QnA qna = getQnA(qnaId);
    
        if (lastIndex == null) {
    				// fix: 결과가 null인 경우 0L
            Long lastIndexByQnAId = qnaCommentRepository.findMaxIdByQnAId(qnaId).orElse(0L);
            return qnaQuerydslRepository.findAllQnAComment(lastIndexByQnAId, qnaId);
        }
    
        // TODO: 탈퇴된 멤버 처리 확인
        return qnaQuerydslRepository.findAllQnAComment(lastIndex, qnaId);
    }
    ```
    
    ```java
    // Repository
    @Query(
        value = "SELECT MAX(id) " +
                "FROM QnAComment " +
                "WHERE qna.id = :qnaId"
    )
    Optional<Long> findMaxIdByQnAId(@Param("qnaId") Long qnaId);
    ```
    
    - 위 쿼리는 가장 최근에 작성된 댓글 아이디를 찾아준다.

실행 결과는 아래와 같다. (댓글이 없는 게시물인 경우)

```json
GET /api/qna/150/comments

[]
```

### 3차 수정

추가적으로 탈퇴한 회원이 작성한 댓글 정보를 받아오지 못하는 것 같아 아래와 같이 수정하였다.

```java
// Service 로직
public List<GetAllCommentByQnAId> getAllQnACommentByQnAId(Long lastIndex, Long qnaId) {
    QnA qna = getQnA(qnaId);

    if (lastIndex == null) {
        Long lastIndexByQnAId = qnaCommentRepository.findMaxIdByQnAId(qnaId).orElse(0L);
        List<QnAComment> comments = qnaQuerydslRepository.findAllQnAComment(lastIndexByQnAId, qnaId);
        return qnaCommentMapper.toQnAComments(comments);
    }

    List<QnAComment> comments = qnaQuerydslRepository.findAllQnAComment(lastIndex, qnaId);
    return qnaCommentMapper.toQnAComments(comments);
}
```

```java
// Mapper 로직
public List<GetAllCommentByQnAId> toQnAComments(List<QnAComment> comments) {
    List<GetAllCommentByQnAId> result = new ArrayList<>();

    for (QnAComment comment : comments) {
        result.add(
            GetAllCommentByQnAId.builder()
                .id(comment.getId())
                .member(toMember(comment.getMember()))
                .content(comment.getContent())
                .likes(comment.getLikes())
                .dislikes(comment.getDislikes())
                .createdAt(comment.getCreatedAt())
                .build()
        );
    }

    return result;
}
```

결과:

```json
// 탈퇴한 사용자 댓글 응답
[
    {
        "id": 180,
        "member": {
            "id": 0,
            "nickname": "탈퇴한 사용자",
            "profileImageUrl": "default_user.png",
            "introduction": "탈퇴한 사용자입니다."
        },
        "content": "안녕하세요",
        "likes": 0,
        "dislikes": 0,
        "createdAt": "2024-02-11T22:00:18"
    },
    {
        "id": 179,
        "member": {
            "id": 0,
            "nickname": "탈퇴한 사용자",
            "profileImageUrl": "default_user.png",
            "introduction": "탈퇴한 사용자입니다."
        },
        "content": "안녕하세요",
        "likes": 0,
        "dislikes": 0,
        "createdAt": "2024-02-11T22:00:17"
    },
    {
        "id": 178,
        "member": {
            "id": 0,
            "nickname": "탈퇴한 사용자",
            "profileImageUrl": "default_user.png",
            "introduction": "탈퇴한 사용자입니다."
        },
        "content": "안녕하세요",
        "likes": 0,
        "dislikes": 0,
        "createdAt": "2024-02-11T22:00:16"
    },
    {
        "id": 177,
        "member": {
            "id": 0,
            "nickname": "탈퇴한 사용자",
            "profileImageUrl": "default_user.png",
            "introduction": "탈퇴한 사용자입니다."
        },
        "content": "안녕하세요",
        "likes": 0,
        "dislikes": 0,
        "createdAt": "2024-02-11T22:00:15"
    },
...
]
```

```json
탈퇴하지 않은 사용자 댓글 응답
[
    {
        "id": 135,
        "member": {
            "id": 146,
            "nickname": "닉네임10",
            "profileImageUrl": null,
            "introduction": "성장하는 개발자입니다."
        },
        "content": "반갑습니다.",
        "likes": 0,
        "dislikes": 0,
        "createdAt": "2024-01-19T03:23:09"
    },
    {
        "id": 134,
        "member": {
            "id": 146,
            "nickname": "닉네임10",
            "profileImageUrl": null,
            "introduction": "성장하는 개발자입니다."
        },
        "content": "성장합니다......",
        "likes": 1,
        "dislikes": 0,
        "createdAt": "2024-01-19T03:08:17"
    }
]
```

## 참고 자료

- https://thalals.tistory.com/350
- https://jojoldu.tistory.com/528
