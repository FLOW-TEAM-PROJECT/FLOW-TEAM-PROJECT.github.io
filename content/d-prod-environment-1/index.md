---
emoji: ☁️
title: Server Production 환경 구축하기(1) - VPC와 서브넷으로 EC2 추가하기
date: '2024-02-16 00:00:00'
author: 유희진
tags: DevOps
categories: DevOps Cloud
---

## VPC(Virtual Private Cloud)

![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/c888fb7f-d6f4-463e-a38b-9e5a43ec732e)
[https://velog.io/@server30sopt/VPC-서브넷-설정으로-RDS에-안전하게-접근하기](https://velog.io/@server30sopt/VPC-%EC%84%9C%EB%B8%8C%EB%84%B7-%EC%84%A4%EC%A0%95%EC%9C%BC%EB%A1%9C-RDS%EC%97%90-%EC%95%88%EC%A0%84%ED%95%98%EA%B2%8C-%EC%A0%91%EA%B7%BC%ED%95%98%EA%B8%B0)

- 물리적으로는 같은 클라우드 상에 있으나, **보안상의 목적을 위해 논리적으로 다른 클라우드인 것처럼 동작하도록 만든 가상 클라우드 환경**
- VPC 별로 다른 네트워크를 설정할 수 있으며, 독립된 네트워크처럼 작동한다.
- 만약 VPC를 설정하지 않은 경우 아래와 같은 구조를 띈다.
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/2ed11c0a-7625-4327-9d10-6a969b84a3f3)

- 하나의 VPC는 하나의 Region 내에서만 생성이 가능하지만, 두 개 이상의 리전에 걸치는 것은 불가능하다.
- 하지만 하나의 VPC는 여러개의 Amazon Availability Zone에 걸쳐서 생성될 수 있다.

### VPC 구조
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/eec45e4a-4b03-4d09-9f76-06678aed4e65)

## 서브넷(Subnet)

- 보안, 통신 성능 향상 등을 목적으로 VPC를 쪼갠 단위

### Public Subnet

- 외부에서 접근 가능한 네트워크 영역
- 인터넷 게이트웨이, ELB, Public IP / Elastic IP를 가진 인스턴스를 내부에 가지고 있다.

### Private Subnet

- 외부에서 접근이 불가능한 네트워크 영역
- NAT 게이트웨이를 사용하면 내부에서 외부로는 접근이 가능하다.
- 일반적으로 중요한 리소스들을 엄격하게 관리하기 위해 사용된다.

## CIDR

- CIDR란 Classless Inter-Domain Routing으로, **클래스 없는 도메인 간 라우팅 기법이라는 뜻이다.**
    - 즉, 도메인 간의 라우팅에 사용되는 인터넷 주소를 원래 IP 주소 클래스 체계를 쓰는 것보다 능동적으로 할당하여 지정하는 방식
- 기존에는 Class로 A, B, C, D, E로 나누어 네트워크를 사용했는데, 클래스로 나누게 되는 경우 IP 유연성이 떨어지고 IP의 개수가 많기 때문에 좀 더 유연하게 사용하고자 CIDR라는 개념이 등장했다.
- 주소의 영역을 여러 네트워크 영역으로 나누기 위해 IP를 묶는 방식으로, IP 주소 범위를 정의하는 방식

### CIDR 블록

- CIDR블록 = 서브넷
- 예를 들어, `192.168.0.0/16` 대역망이 있을 때, 아래 사진은 이 대역망을 세 개의 네트워크 단위인 서브넷으로 쪼갠 것이다.
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/e2a7ba46-3fa0-4c37-847d-ddb79dbf0da1)


## NAT(Network Address Translation) Gateway
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/d5e029b1-1bb0-4c59-bf66-ba92d2014793)

https://kimjingo.tistory.com/180

- Private 서브넷의 인스턴스가 VPC 외부의 서비스에 연결할 수 있지만, 외부 서비스에서는 연결할 수 없도록 하는 게이트웨이 서비스
- 즉, 외부 서비스에서 private 서브넷 인스턴스로 접근할 수 없게 하되, private 서브넷의 인스턴스에서는 외부 서비스로 접근할 수 있게 도와주는 서비스
- NAT 게이트웨이를 사용하면 **private 서브넷의 스트리밍 인스턴스가 인터넷 또는 다른 AWS 서비스에 연결할 수 있지만 인터넷에서 해당 인스턴스와의 연결을 시작하지 못하도록** 할 수 있다.

## 인터넷 게이트웨이

- **VPC의 인스턴스와 인터넷 간에 통신을 할 수 있게** 해주는 게이트웨이
- 만약 인터넷으로 데이터를 보내야한다면 당연히 인터넷 게이트웨이로 트래픽을 전달해야 한다.
- **서브넷이 인터넷 게이트웨이로 향하는 라우팅이 있는 경우 퍼블릭(Public) 서브넷**이라 부르며, 반대로 어떤 서브넷이 **인터넷 연결을 할 필요가 없다면 해당 서브넷은 프라이빗(Private) 서브넷**이라고 부른다.

## ACL(Network Access Control list)

- 네트워크 엑세스 제어 목록
- VPC를 위한 하나 이상의 서브넷에서 들어오고 나가는 트래픽을 제어하기 위한 방화벽 역할을 하는 보안 계층
- VPC에 보안 그룹과 비슷한 추가적인 보안 계층을 추가하기 위해 ACL을 설정할 수 있다.
- 보안 그룹은 인스턴스 단에서 보안을 실행한다면, ACL은 서브넷 단에서 보안을 수행한다.

### 보안 그룹과 ACL 비교

| 보안그룹 | 네트워크 ACL |
| --- | --- |
| 인스턴스 단에서 실행 | 서브넷 단에서 실행 |
| 허용(allow) 규칙만 지원 | 허용(allow) 및 거부(deny) 규칙 지원 |
| 스테이트풀(stateful): 어떤 규칙과도 관계없이, 반환 트래픽이 자동적으로 허용된다. | 스테이트레스(stateless): 반환 트래픽이 특정 규칙에 의해서 허용된다. |
| 트래픽을 허용할 것인가에 대한 결정 전 모든 규칙을 평가한다. | 트래픽을 허용할 것인가에 대해 결정할 때 가장 낮은 번호의 규칙부터 시작하여 순서대로 규칙들을 수행한다. |
| 인스턴스를 시작할 때 보안그룹을 명시하거나 나중에 인스턴스와 보안그룹을 연결할 때에만 인스턴스에 적용된다. | 연결된 서브넷 내 모든 인스턴스에 자동적으로 적용된다. (그리하여, 보안그룹이 너무 관대할 경우, 추가적인 방화벽을 제공한다.) |

## Elastic IP

- 탄력적 IP 주소
- 인터넷을 통해 접속할 수 있는 고정적인 공인 IP 주소

## 라우팅 테이블(Routing table)

- 네트워크 상의 특정 목적지까지의 거리와 가는 방법 등을 명시하고 있는 테이블
- 라우터는 어떤 목적지를 찾아갈 때 해당 라우팅 테이블을 보고 찾아간다.

### AWS에서의 라우팅 테이블

- 서브넷 혹은 게이트웨이를 통해서 네트워크 트래픽이 어디로 향하는지에 대해 결정할 때 사용되는 routes라는 몇가지 룰을 포함한다.
- VPC 내에는 Subnet이 있으며, 각 서브넷은 각기 다른 네트워크 대역을 가지고 있다.
- 한 서브넷에서 다른 서브넷으로 가려면 라우팅이 필요하다.
- VPC 내부에 대해서는 자동으로 라우팅이 생성되기 때문에 별다른 설정 없이 한 서브넷에서 다른 서브넷으로 통신이 가능하다.

# 실제 배포 환경 구축해보기

[[AWS] 사용자지정 VPC 만들어서 Public, Private 서브넷 만들기](https://jenakim47.tistory.com/14)

## VPC 생성
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/0e62ac95-1757-4c47-8598-8486aa877a0d)

우선 해당 프로젝트 배포를 위한 VPC를 위와 같이 생성한다.

## subnet 생성
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/110a45ce-8f83-4867-95d5-e30c20f99192)
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/24ffa4ef-11ea-4267-8e9d-fa580bf89fac)
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/4253b0a8-79bc-4bfe-8006-13870e42d7d3)

public subnet과 private subnet을 각각 생성한다.

public subnet은 `10.0.0.0/24`, private subnet은 `10.0.1.0/24` 로 설정한다.

추후 서브넷을 추가하는 경우 `10.0.2.0/24`, `10.0.3.0/24` … 와 같이 설정한다.

## 라우팅 테이블 생성
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/60f01793-2ec0-416d-b946-2aca028a97ad)
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/3b41aa93-7cab-46a2-8777-8cd5cb8d9ebf)

- 생성 시 **public subnet을 위한 테이블과 private subnet을 위한 테이블을 별도로 생성해야한다.**

## 인터넷 게이트웨이 생성
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/a952b6b9-30b0-4b33-a6fe-0a01cf891dca)
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/ce20ad79-2446-477f-9ae5-55a1180ac0b7)
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/2cabce0e-33b7-4555-8c0a-b5d3d3a903c9)

- 생성 후 **public 서브넷의 라우팅 테이블에 연결해야 인터넷 사용이 가능**하다.
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/aeab2ff7-1249-44d7-b567-fc153ee43e78)


## NAT 게이트웨이 생성
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/87cea89f-8772-4775-b8c4-a82cb51690e4)

- NAT 게이트웨이는 public 서브넷에 생성해야한다.
- 생성 후 private 서브넷의 라우팅 테이블에 NAT 게이트웨이를 넣어준다.
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/6a683e01-2143-4397-b525-71e18b922730)


## ACL 설정하기
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/0e70d11b-dc1c-489d-8003-2fd3b31b27e0)

## EC2 생성하기
![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/cb5bd525-4ccf-4464-b62b-88ab4a9aa5e6)
- public subnet에 EC2를 생성한다.
- private subnet에 생성할 경우 퍼블릭 IP는 비활성화해야한다.

# 생성된 환경에 직접 접속해보기

### EC2 접속하기

- 처음에 SSH로 접속이 안 됐는데, ACL에서 80만 허용했기 때문에 안되는 것 같아 22번 포트를 추가했다.
    - 22번 포트를 추가하면 잘 접속된다.
- 그러나 위 상황에서 apt-get update를 하면 오류가 발생한다.
    
    ```bash
    curl: (28) Failed to connect to download.docker.com port 443 after 278781 ms: Connection timed out
    gpg: no valid OpenPGP data found.
    ```
    
    - 원인은 ACL 때문인데, 이때 ACL 설정을 모든 요청 허용으로 변경하면 해결된다. (결국 무용지물이 된 ACL.. ㅠ_ㅠ)
      ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/26884dca-1c20-40d4-bc58-55e70d558d3d)

    - 원인은 잘 모르지만 우선은 보안그룹 내에서 인바운드 규칙을 관리하기로 했다.
- 여하튼 접속하면 아주 잘 된다!
    ![image](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/96467030/9f551ce0-799e-430f-8d49-0094d6eb4816)


# 참고 자료

- [https://inpa.tistory.com/entry/AWS-📚-탄력적-IP-Elastic-IP-EIP-란-무엇인가](https://inpa.tistory.com/entry/AWS-%F0%9F%93%9A-%ED%83%84%EB%A0%A5%EC%A0%81-IP-Elastic-IP-EIP-%EB%9E%80-%EB%AC%B4%EC%97%87%EC%9D%B8%EA%B0%80)
- [https://martinkim1954.tistory.com/entry/AWS-ACL-및-보안그룹-비교-생성-및-적용](https://martinkim1954.tistory.com/entry/AWS-ACL-%EB%B0%8F-%EB%B3%B4%EC%95%88%EA%B7%B8%EB%A3%B9-%EB%B9%84%EA%B5%90-%EC%83%9D%EC%84%B1-%EB%B0%8F-%EC%A0%81%EC%9A%A9)
- [https://tech.cloud.nongshim.co.kr/2018/10/16/4-네트워크-구성하기vpc-subnet-route-table-internet-gateway/](https://tech.cloud.nongshim.co.kr/2018/10/16/4-%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC-%EA%B5%AC%EC%84%B1%ED%95%98%EA%B8%B0vpc-subnet-route-table-internet-gateway/)
- https://kimjingo.tistory.com/180
- https://jenakim47.tistory.com/14
- [https://velog.io/@server30sopt/VPC-서브넷-설정으로-RDS에-안전하게-접근하기](https://velog.io/@server30sopt/VPC-%EC%84%9C%EB%B8%8C%EB%84%B7-%EC%84%A4%EC%A0%95%EC%9C%BC%EB%A1%9C-RDS%EC%97%90-%EC%95%88%EC%A0%84%ED%95%98%EA%B2%8C-%EC%A0%91%EA%B7%BC%ED%95%98%EA%B8%B0)
- https://pjh3749.tistory.com/283
- https://yoo11052.tistory.com/40
- [https://martinkim1954.tistory.com/entry/AWS-라우팅테이블Route-Table-생성-및-라우팅](https://martinkim1954.tistory.com/entry/AWS-%EB%9D%BC%EC%9A%B0%ED%8C%85%ED%85%8C%EC%9D%B4%EB%B8%94Route-Table-%EC%83%9D%EC%84%B1-%EB%B0%8F-%EB%9D%BC%EC%9A%B0%ED%8C%85)
- [https://inpa.tistory.com/entry/WEB-🌐-CIDR-이-무얼-말하는거야-⇛-개념-정리-계산법](https://inpa.tistory.com/entry/WEB-%F0%9F%8C%90-CIDR-%EC%9D%B4-%EB%AC%B4%EC%96%BC-%EB%A7%90%ED%95%98%EB%8A%94%EA%B1%B0%EC%95%BC-%E2%87%9B-%EA%B0%9C%EB%85%90-%EC%A0%95%EB%A6%AC-%EA%B3%84%EC%82%B0%EB%B2%95)
- https://algopoolja.tistory.com/97
- [https://hstory0208.tistory.com/entry/네트워크-Class란-CIDR-란-차이점-및-개념을-쉽게-이해해보자-feat서브넷팅-슈퍼넷팅](https://hstory0208.tistory.com/entry/%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC-Class%EB%9E%80-CIDR-%EB%9E%80-%EC%B0%A8%EC%9D%B4%EC%A0%90-%EB%B0%8F-%EA%B0%9C%EB%85%90%EC%9D%84-%EC%89%BD%EA%B2%8C-%EC%9D%B4%ED%95%B4%ED%95%B4%EB%B3%B4%EC%9E%90-feat%EC%84%9C%EB%B8%8C%EB%84%B7%ED%8C%85-%EC%8A%88%ED%8D%BC%EB%84%B7%ED%8C%85)
