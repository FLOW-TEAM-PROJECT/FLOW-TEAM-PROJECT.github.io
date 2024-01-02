---
emoji: 📝
title: Backend Issue/PR Convention
date: '2023-12-26 00:00:00'
author: 유희진
tags: Backend Convention
categories: Backend Convention
---
## Issue Guide

- 각 목적에 맞는 이슈 템플릿을 사용합니다.
- 이슈 제목은 **스프린트를 한 줄로 요약해서 작성**해주세요.
- 라벨은 `기능 구현 / 오류 해결 / 리팩토링` 등 상황에 맞는 라벨을 달아주세요.
- `Assignee`는 각 스프린트의 담당자를 지정합니다.
- PR 시 완료 라벨을 달아주시고, Merge되면 해당 이슈를 반드시 닫아줍니다. (PR에서 설정)
- 커밋 메세지 작성 시 반드시 이슈 번호를 달아 커밋 메세지를 해당 이슈에서 볼 수 있도록 합니다.

## PR Guide

- PR 템플릿을 사용하여 최대한 상세하게 작성합니다.
- PR 제목은 이슈 제목과 일치시켜주세요.
- `Reviewer`는 코드 리뷰어 및 테스터를 설정합니다.
- **Approved 승인 없이는 절대 Merge하지 않습니다.**
    - 승인 전 반드시 오류가 없는지 테스트해주시고, 코드 컨벤션을 지켰는지 확인해주세요.
- Merge target은 반드시 `main` 브랜치로 지정해주세요.
- PR을 보내기 전 반드시 pull을 받아 최신 상태를 유지해주세요.