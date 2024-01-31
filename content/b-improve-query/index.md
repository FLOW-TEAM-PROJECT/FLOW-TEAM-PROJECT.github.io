---
emoji: ☁️
title: Q&A 추천/비추천, Q&A 스크랩 - 바인딩 변수 사용, 쿼리문 및 로직 개선
date: '2024-02-01 00:00:00'
author: 유희진
tags: Backend
categories: Backend
---

## 추천/비추천 로직 개선

Q&A 추천/비추천 로직을 이전에는 아래와 같이 작성했다.

```java
// Q&A 추천 로직 코드
@Transactional
public void createLike(Long qnaId) {
	Member member = this.getMember();
	QnA qna = this.checkQnAValidate(qnaId);
	QnALikeDislikeId id = new QnALikeDislikeId(member, qna);
	
	qnaLikeDislikeRepository.findById(id)
	    .ifPresentOrElse(
	        result -> {
	            switch (result.getStatus()) {
	                case G:
	                    this.updateDeleteStatus(result, id);
	                    break;
	
	                case B:
	                    if (result.getIsDeleted()) {
	                        qnaLikeDislikeRepository.recoverLikeDislike(member, qna);
	                    }
	                    qnaLikeDislikeRepository.updateQnALikeStatusToGood(member, qna);
	                    break;
	            }
	        },
	        () -> {
	            QnALikeDislike likeDislike = new QnALikeDislike(id, LikeStatus.valueOf("G"));
	            qnaLikeDislikeRepository.save(likeDislike);
	        }
	    );
	
	this.updateLikesAndDislikes(qna);
}

private void updateDeleteStatus(QnALikeDislike likeDislike, QnALikeDislikeId id) {
    if (!likeDislike.getIsDeleted()) {
        qnaLikeDislikeRepository.deleteById(id.getMember(), id.getQna());
    } else {
        qnaLikeDislikeRepository.recoverLikeDislike(id.getMember(), id.getQna());
    }
}

// repository
@Modifying
@Query(
        value = "UPDATE QnALikeDislike " +
                "SET status = 'G' " +
                "WHERE id.member = :member AND id.qna = :qna AND isDeleted = false"
)
void updateQnALikeStatusToGood(@Param("member")Member member, @Param("qna") QnA qna);

@Modifying
@Query(
    value = "UPDATE QnALikeDislike " +
            "SET status = 'B' " +
            "WHERE id.member = :member AND id.qna = :qna AND isDeleted = false"
)
void updateQnALikeStatusToBad(@Param("member")Member member, @Param("qna") QnA qna);

@Modifying
@Query(
    value = "UPDATE QnALikeDislike " +
            "SET isDeleted = true " +
            "WHERE id.member = :member AND id.qna = :qna"
)
void deleteById(@Param("member")Member member, @Param("qna") QnA qna);
```

기존 추천/비추천 로직은 다음과 같다.

1. qnaId, memberId를 이용해 추천/비추천 데이터를 findById로 받아온다.
2. 만약 데이터가 있는 경우, 아래와 같이 데이터를 처리한다. (추천 로직 기준으로 설명한다.)
    1. `G(추천)`, `B(비추천)` 여부를 받아온다.
    2. 만약 **상태가 추천**이라면, 삭제가 안 된 경우 추천 취소로 인식하고 해당 데이터를 삭제한다.
    3. **상태가 추천**인데 삭제된 경우 다시 복구 시킨다. (다시 추천)
    4. **상태가 비추천**인 경우, 만약 해당 데이터가 삭제되었으면 복구 후 추천 상태로 변경한다. (B → G)
3. 데이터가 없는 경우 새로 만들어준다.
    
    

하지만 생각해보니,, 데이터를 굉장히 비효율적으로 처리한다는 생각이 들었다. 🥲

일반적으로 쿼리를 두번 사용하는 것보다 한 번에 요청하는 것이 더 효율적인 것으로 알고 있다.

그래서 고민 끝에 쿼리를 아래와 같이 수정해 로직을 개선했다.

```java
@Transactional
public void createQnALike(Long qnaId) {
    Member member = this.getMember();
    QnA qna = this.getQnA(qnaId);
    QnALikeDislikeId id = new QnALikeDislikeId(member, qna);

    qnaLikeDislikeRepository.findById(id)
        .ifPresentOrElse(
            result -> {
                switch (result.getStatus()) {
                    case G:
                        qnaLikeDislikeRepository.updateDeleteStatus(member, qna);
                        break;

                    case B:
                        qnaLikeDislikeRepository.updateQnALikeStatusToGoodOrBad(
                            member,
                            qna,
                            false,
                            LikeStatus.G
                        );
                        break;
                }
            },
            () -> {
                QnALikeDislike likeDislike = new QnALikeDislike(id, LikeStatus.valueOf("G"));
                qnaLikeDislikeRepository.save(likeDislike);
            }
        );

    this.updateLikesAndDislikes(qna);
}

// repository
@Modifying
@Query(
        value = "UPDATE QnALikeDislike " +
                "SET status = :status, isDeleted = :isDeleted " +
                "WHERE id.member = :member AND id.qna = :qna"
)
void updateQnALikeStatusToGoodOrBad(
    @Param("member")Member member,
    @Param("qna") QnA qna,
    @Param("isDeleted") Boolean isDeleted,
    @Param("status") LikeStatus status
);

@Query(
    value = "SELECT COUNT(q) " +
            "FROM QnALikeDislike q " +
            "WHERE q.id.qna = :qna AND q.status = :status AND q.isDeleted = :isDeleted"
)
int countQnALikeOrDislikeByQnAId(
    @Param("qna") QnA qna,
    @Param("status") LikeStatus status,
    @Param("isDeleted") Boolean isDeleted
);

@Modifying
@Query(
    value = "UPDATE QnALikeDislike " +
            "SET isDeleted = IF(isDeleted, false, true) " +
            "WHERE id.member = :member AND id.qna = :qna"
)
void updateDeleteStatus(@Param("member")Member member, @Param("qna") QnA qna);
```

개선한 점은 다음과 같다.

1. `G(추천)`, `B(비추천)` 여부를 받아온다.
2. 만약 **상태가 추천**이라면, IF 함수를 사용해서 삭제된 경우 삭제 취소, 삭제되지 않은 경우 삭제하도록 쿼리를 변경했다.
    
    ```sql
    SET isDeleted = IF(isDeleted, false, true)
    ```
    
3. **상태가 비추천**인 경우, 삭제 여부랑 상관없이 `isDeleted = false`로 변경한 후 상태를 G로 변경한다.

기존 로직과 달리 쿼리를 한 번만 실행하기 때문에 로직 및 속도를 개선할 수 있었다.

추가적으로 바인딩 변수를 사용하도록 JPQL 쿼리를 수정했다.

```java
// 기존
@Modifying
@Query(
        value = "UPDATE QnALikeDislike " +
                "SET status = 'G' " +
                "WHERE id.member = :member AND id.qna = :qna AND isDeleted = false"
)
void updateQnALikeStatusToGood(@Param("member")Member member, @Param("qna") QnA qna);

@Modifying
@Query(
    value = "UPDATE QnALikeDislike " +
            "SET status = 'B' " +
            "WHERE id.member = :member AND id.qna = :qna AND isDeleted = false"
)
void updateQnALikeStatusToBad(@Param("member")Member member, @Param("qna") QnA qna);

// 개선
@Modifying
@Query(
        value = "UPDATE QnALikeDislike " +
                "SET status = :status, isDeleted = :isDeleted " +
                "WHERE id.member = :member AND id.qna = :qna"
)
void updateQnALikeStatusToGoodOrBad(
    @Param("member") Member member,
    @Param("qna") QnA qna,
    @Param("isDeleted") Boolean isDeleted,
    @Param("status") LikeStatus status
);
```

바인딩 변수를 사용하면 아래와 같은 장점이 있다. (from 친절한 SQL 튜닝)

[](https://github.com/yu-heejin/kind-SQL-tuning/blob/main/1장/1.2_SQL_공유_및_재사용.md)

- SQL의 경우, 캐시에 저장될 때 별도의 이름이 따로 없고, SQL문 자체가 이름이 된다.
- 따라서 기존 SQL의 경우, 두 SQL문이 별도로 라이브러리 캐시에 저장된다.
    
    ```sql
    UPDATE QnALikeDislike
    SET status = 'G'
    WHERE id.member = :member AND id.qna = :qna AND isDeleted = false
    
    UPDATE QnALikeDislike
    SET status = 'B'
    WHERE id.member = :member AND id.qna = :qna AND isDeleted = false
    ```
    
- 하지만 바인딩 변수를 사용할 경우, **캐시에는 단 하나의 쿼리문만 저장되기 때문에 캐시 공간을 절약할 수 있다.**
- 조회 시 캐시에는 다음과 같이 저장될 것이다.
    
    ```sql
    UPDATE QnALikeDislike 
    SET status = :status, isDeleted = :isDeleted
    WHERE id.member = :member AND id.qna = :qna
    ```
    

바인딩 변수를 사용하면 SQL Injection도 예방할 수 있다고 하는데, JPA는 내부적으로 PreparedStatement를 사용한다고 알고 있어서 이 부분에 대해서는 추가로 더 알아봐야 할 것 같다.

## 스크랩 로직 개선

Q&A 스크랩도 비슷한 로직으로 작성하려고 했었다.

기존에 내가 생각했던 방식은 아래와 같다.

1. `findById`로 스크랩 데이터를 찾는다.
2. 이미 있는 경우 스크랩 취소로 인식하고 `deleteById`를 수행한다.
3. 이미 데이터가 있는데 deleted된 경우 다시 복구시킨다.
4. 없으면 새로 만들어주어 스크랩을 성공시킨다.

그러나 위와 같은 로직으로 작성하니 if 분기가 생기기도 하고, 복잡해지기도 해서 어떻게 개선할지 고민하다가, 예전에 회사에서 기존 백엔드 서버 리팩토링 프로젝트를 할 때 배웠던 `ON DUPLICATE KEY UPDATE`를 사용하기로 했다.

```java
@Transactional
public void createQnAScrap(Long qnaId) {
    Long memberId = getMemberId();
    qnaScrapRepository.createOrUpdateQnAScrap(memberId, qnaId);
}

@Modifying
@Query(
    nativeQuery = true,
    value = "INSERT INTO qna_scrap (member_id, qna_id) " +
            "VALUES (:memberId, :qnaId) " +
            "ON DUPLICATE KEY UPDATE is_deleted = IF(is_deleted, 0, 1)"
)
void createOrUpdateQnAScrap(@Param("memberId") Long memberId, @Param("qnaId") Long qnaId);
```

`ON DUPLICATE KEY UPDATE`는 중복된 key값이 있는 경우 지정된 값으로 업데이트하고, 아니라면 `INSERT`하는 쿼리이다.

[](https://github.com/techeer-TIL-group/yu-heejin/blob/main/Database/on-duplicate-key-update.md)

위 쿼리를 사용하여 토글 방식을 더 간단하게 처리할 수 있었다. 😆
