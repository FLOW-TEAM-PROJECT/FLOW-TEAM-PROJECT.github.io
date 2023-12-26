---
emoji: 📝
title: Backend Branch Convention
date: '2023-12-26 00:00:00'
author: 유희진
tags: Backend Convention
categories: Backend Convention
---
## Git Flow

> 브랜치 전략은 기본적으로 Git flow 전략을 사용합니다.
> 
- main (master) : 사용자에게 배포되는 Stable 브랜치
- develop : 다음 릴리즈를 위해 기능들을 모으는 최신 브랜치
- feature : 특정 기능 개발을 위한 브랜치
- release : 릴리즈를 위해 버그 픽스 (Bug fix)를 모으는 브랜치
- hotfix : 긴급 버그 픽스를 위한 브랜치
- support : 버전 호환성 문제를 위한 브랜치

## Branch Naming

<aside>
💡 {git flow prefix}/issue-{issue number}/{name}

</aside>

- 브랜치명은 반드시 **소문자로만 작성**해주시고, **케밥 케이스로 작성**합니다.
- name은 스프린트를 영어로 요약하여 작성해주세요.

## 참고 사이트

- [우아한 형제들 기술블로그 - 우린 Git-flow를 사용하고 있어요](https://techblog.woowahan.com/2553/)
- [Git-Flow & Commit message & Issue 이용해서 협업하기](https://velog.io/@u-nij/Git-Flow-Commit-message-Issue-%EC%9D%B4%EC%9A%A9%ED%95%B4%EC%84%9C-%ED%98%91%EC%97%85%ED%95%98%EA%B8%B0)