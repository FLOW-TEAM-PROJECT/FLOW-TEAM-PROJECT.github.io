---
emoji: ☁️
title: Spring Boot에서 Docker 이미지 최적화하기
date: '2024-02-02 00:00:00'
author: 유희진
tags: DevOps
categories: DevOps
---
일반적으로 Spring Boot 애플리케이션을 Docker를 이용해 배포할 경우 아래와 같이 작성한다.

```docker
FROM openjdk:11-jdk
ARG JAR_FILE=./build/libs/*-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8080
ENTRYPOINT [ "java", "-jar", "/app.jar" ]
```

그러나 위와 같이 Docker 이미지를 만드는 것은 상당히 비효율적이다.

Docker는 빌드 시 레이어마다 캐시 기능을 사용할 수 있기 때문에 빠른 빌드가 가능하다.

만약 변경된 부분이 없다면 캐시를 이용해 기존에 빌드했던 레이어를 재사용하기 때문에 속도가 빨라진다.

하지만 위와 같이 코드를 작성하면 **jar 파일 전체를 빌드하기 때문에 캐시 기능을 사용할 수 없다.**

Dockerfile을 위 구조로 구성하면, Java의 모든 구조가 jar 파일로 묶이기 때문에 layer를 재사용하기 어렵기 때문이다.

## 기존 방식으로 Docker 빌드하기

- 첫 애플리케이션 빌드 (6.6s)
    
   ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/13ac357c-a58e-4513-81be-13e4298731bf)

    
- 코드 수정 후 재빌드 (5.0s)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/659ebd68-1a04-4405-b5f1-44e7d8c03299)

    
- 이미지 크기는 아래와 같다. (약 700MB)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/438dc94e-045e-42a0-917b-03090dc0054c)


## 새로운 방식으로 Docker 빌드하기 - Layered Jar 사용하기

```docker
FROM adoptopenjdk:11-jre-hotspot as builder
WORKDIR application
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} application.jar
RUN java -Djarmode=layertools -jar application.jar extract

FROM adoptopenjdk:11-jre-hotspot
WORKDIR application
ENV spring.profiles.active dev
COPY --from=builder application/dependencies ./
COPY --from=builder application/spring-boot-loader ./
COPY --from=builder application/snapshot-dependencies ./
COPY --from=builder application/application ./

ENTRYPOINT ["java", "org.springframework.boot.loader.JarLauncher"]
```

### Layered Jar란?

- Layered Jar란 jar파일을 4개의 영역으로 분리하여 런타임 시 모듈화 및 커스터마이징 할 수 있도록하는 기술이다.
- Spring Boot는 아래와 같이 jar파일을 4개의 영역으로 만들 수 있다.
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/a5c3c0d4-2e0a-4fab-bbcb-e02cd8436994)

    
    [https://velog.io/@ssol_916/Gradle-Layered-Jar-그리고-Dockerbuild-최적화](https://velog.io/@ssol_916/Gradle-Layered-Jar-%EA%B7%B8%EB%A6%AC%EA%B3%A0-Dockerbuild-%EC%B5%9C%EC%A0%81%ED%99%94)
    
    - 구성은 아래와 같다.
        - application: 애플리케이션 소스코드
        - snapshot-dependencies: 프로젝트 클래스 경로에 존재하는 스냅샷 종속성 jar 파일
        - spring-boot-loader: jar loader와 luncher
        - dependencies: 프로젝트 클래스 경로에 존재하는 라이브러리 jar 파일
    - 위로 갈수록 변경이 잦은 부분이며, 아래로 갈수록 변경이 잦지 않다.
        - 당연하게도 소스 코드가 가장 많이 수정이 이루어지기 때문!
    - 따라서 Docker 캐시 기능을 사용하기 위해, COPY 순서를 역순으로 배치한다.

- 첫 애플리케이션 빌드 (8.1s)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/63cc5eb1-a7da-4437-bf9c-92ee4680ba70)

    
- 코드 수정 후 재빌드 (6.0s)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/157648fe-9dea-4aa1-8062-494516e810ff)

    
- 이미지 크기는 아래와 같다 (약 200MB)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/33d3c034-49a6-4e3f-87b4-5b8cbfc8f118)

    

## 새로운 방식에서 약간(?) 변형하기

시간이 2초정도 단축되었지만 여전히 속도가 느리다는 문제가 발생한다.

자세히는 알 수 없지만 **jar 파일을 가져오는 과정은 변함이 없기 때문에 느린 것 같다.**

그러나 레이어를 나눌 수 있다는 점을 이용해 아래와 같이 코드를 변경시켰다.

```docker
FROM adoptopenjdk:11-jre-hotspot
WORKDIR application
COPY ./dependencies ./
COPY ./spring-boot-loader ./
COPY ./snapshot-dependencies ./
COPY ./application ./

ENTRYPOINT ["java", "-Dspring.profiles.active=dev", "-Duser.timezone=Asia/Seoul", "org.springframework.boot.loader.JarLauncher"]
```

기존 방식에서 jar 파일을 통째로 COPY하는 과정을 제외하고, 자동화 배포 시 layer를 분리하여 해당 레이어들만 복사하는 방식으로 변형하였다.

실행 스크립트도 다음과 같이 수정했다.

```bash
#!/bin/bash
source ../.env

git submodule update --remote --recursive --init
cd ..
./gradlew clean build
cd api-module
java -Djarmode=layertools -jar build/libs/${JAR_NAME} extract   # 해당 부분 추가
cd ..
docker-compose up -d --build
```

배포 GitHub Actions에는 아래와 같이 jar 파일을 분리하는 명령을 추가했다.

```yaml
- name: Build Docker & push
  run: |
    cd ./api-module
    java -Djarmode=layertools -jar build/libs/${{ secrets.JAR_NAME }} extract   # 해당 부분 추가
    docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
    docker build -t ${{ secrets.DOCKER_USERNAME }}/${{ secrets.DOCKER_REPOSITORY }}:server-dev-blue .
    docker build -t ${{ secrets.DOCKER_USERNAME }}/${{ secrets.DOCKER_REPOSITORY }}:server-dev-green .
    docker push ${{ secrets.DOCKER_USERNAME }}/${{ secrets.DOCKER_REPOSITORY }}:server-dev-blue
    docker push ${{ secrets.DOCKER_USERNAME }}/${{ secrets.DOCKER_REPOSITORY }}:server-dev-green
```

- 첫 실행 결과 (4.3s)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/d8b62bb1-5fc3-4bc3-abf4-c309d4668121)

    
- 코드 수정 후 재빌드 (1.6s)
    
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/df471827-1105-4b61-9de4-464681ec27d5)

    
    - 로컬 환경에서 재빌드 시 약 6~8초에서 1초 정도로 단축하였다.
- 빌드 후 이미지 크기 (약 280MB)
    
   ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/9e51a585-8a5e-44aa-aec3-913487065b7c)

    

## 참고 자료

- https://spring.io/guides/topicals/spring-boot-docker/
- [https://velog.io/@yyong3519/SpringBoot-도커-이미지-만들기-최적화](https://velog.io/@yyong3519/SpringBoot-%EB%8F%84%EC%BB%A4-%EC%9D%B4%EB%AF%B8%EC%A7%80-%EB%A7%8C%EB%93%A4%EA%B8%B0-%EC%B5%9C%EC%A0%81%ED%99%94)
- [https://velog.io/@ssol_916/Gradle-Layered-Jar-그리고-Dockerbuild-최적화](https://velog.io/@ssol_916/Gradle-Layered-Jar-%EA%B7%B8%EB%A6%AC%EA%B3%A0-Dockerbuild-%EC%B5%9C%EC%A0%81%ED%99%94)
- https://docs.spring.io/spring-boot/docs/current/gradle-plugin/reference/htmlsingle/#packaging-executable.configuring.layered-archives
