---
emoji: ✏️
title: Spring Security를 이용한 인증/인가 구현
date: '2024-02-01 20:15:20'
author: 하정수
tags: Backend
categories: Backend
---

본 포스팅에서는 프로젝트에서 구현한  사용자 인증 및 인가 구현 과정을 살펴보고자 합니다.  
이를 통해 회원가입, 로그인, 로그아웃 기능을 구현하였습니다.
<br>

## Spring Security 동작 방식  
스프링 시큐리티는 애플리케이션에서 인증/인가에 대한 설정을 편리하게 할 수 있도록 도와줍니다.  

<img width="743" alt="스크린샷 2024-02-01 오후 8 11 42" src="https://github.com/devridge-team-project/devridge-team-project.github.io/assets/56336436/7d97921b-ff4f-41f9-91a5-07095bde181d">

위 사진은 일반적인 Spring 서버에서 요청을 처리하는 구조를 나타내는 그림입니다.  
서블릿 컨테이너 안에는 서블릿에 도달하기 전에 요청을 순차적으로 처리하는 필터들의 집합인, FilterChain 이라는 것이 있습니다.  

#### FilterChain(서블릿 컨테이너)  
- 클라이언트로부터 들어오는 모든 HTTP 요청은 일단 Servlet Container(톰캣)에 의해 처리됩니다.
- FilterChain은 순서대로 요청을 필터링하고 마지막 필터가 처리를 완료하면, 요청은 DispatcherServlet으로 전달됩니다.

#### DelegatingFilterProxy
- Spring의 ApplicationContext에서 FilterChainProxy를 찾고, 모든 보안 관련 작업을 위임합니다.
- DelegatingFilterProxy를 통해 Spring이 관리하는 보안 설정을 서블릿 필터로 통합할 수 있습니다.

#### FilterChainProxy(스프링 시큐리티)
- 시큐리티가 제공하는 요소로, 보안 필터들의 집합이라고 할 수 있습니다.
- DelegatingFilterChainProxy 를 통해 전달받은 요청을 FilterChainProxy에 의해 처리되고 이 과정에서 인증(Authentication), 인가(Authorization) 검사를 수행합니다.

<br>
<br>

## 인증/인가
클라이언트 요청에 대해 인증/인가는 Spring-Security의 Filter 에서 수행합니다.  
Spring-Security를 통해서 다음과 같은 필터들을 만들고 이를 ServletFilterChain 에 포함시켰습니다.  
- JwtAuthenticationFilter
- JwtAuthorizationFilter

스프링 시큐리티는 SecurityFilterChain 클래스를 Bean 으로 등록만 시켜준다면 하면 알아서  
DelegatingFilterProxy 에 ServletFilterChain 에 포함시켜줍니다.
<br>

![인증흐름요약](https://github.com/devridge-team-project/devridge-team-project.github.io/assets/56336436/33bccd66-5aac-4ab9-910d-59387ae713f5)

인증 흐름을 정리하자면 다음과 같습니다.

- 사용자가 id, password를 입력해 로그인을 진행한다 -> 인증 시도
- AuthenticationFilter 에서 UsernamePasswordAuthenticationToken 이라는 인증 객체를 만들어, AuthenticationManager에게 위임한다. (이름이 무척 길다)
- AuthenticationManager는 다시 AuthenticationProvider 에게 인증을 위임하고,  AuthenticationProvider는 UserDetailsService의 loadUserByUsername() 메서드를 통해 UserDetails 객체를 반환받는다.
- 인증 성공 시(id,pw가 일치했다면), AuthenticationFilter는 successfulAuthentication()을 호출해 SecurityContext에 위의 이름 긴 UsernamePasswordAuthenticationToken 객체를 담는다.
- 인증이 실패할 경우 unsuccessfulAuthentication() 호출, exceptionHandler를 실행한다.
<br>

커스텀하게 정의한 클래스는 다음과 같습니다.  

1. CustomMemberDetails (UserDetails)  
2. CustomMemberDetailsService (UserDetailsService)  
3. JwtAuthenticationProvider (AuthenticationProvider)  
4. JwtAuthenticationFilter (AuthenticationFilter)  
5. JwtAuthorizationFilter (AuthorizationFilter)  
6. CustomLogoutHandler (LogoutSuccessHandler)
<br>

또한 SecurityConfig 클래스를 정의해, Spring-Security의 설정을 구성했습니다.  
서블릿 필터의 체인의 일부로 등록되어 시큐리티의 FilterChainProxy에 영향을 미치도록 했습니다.  

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        /**
        	중간 생략
        */
        
        http
            .logout()
            .logoutUrl("/api/logout")
            .logoutSuccessHandler(new CustomLogoutHandler(refreshTokenRepository));

        http
            .authorizeRequests()
            .antMatchers(securityConstant().USER_ROLE_PERMIT_PATHS).hasRole(SecurityConstant.USER_ROLE)
            .anyRequest().denyAll();

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(jwtAuthorizationFilter, JwtAuthenticationFilter.class);

        return http.build();
    }
```

securityFilterChain() 메서드에서 HttpSecurity 객체를 통해 여러 보안 설정을 해주었습니다.

이 메서드 내에서 정의된 설정에 따라 FilterChainProxy에 필터가 추가해주었습니다.


제가 정의한 JwtAuthenticationFilter는 사용자의 JWT 토큰을 검증해 인증 과정을 처리하고,  
JWTAuthorizationFilter는 사용자가 요청한 자원에 대한 접근 권한을 확인하는 역할을 합니다.  

<br>

### JwtAuthenticationFilter
- UsernamePasswordAuthenticationFilter를 확장하여 JWT 기반의 인증 로직을 구현한 커스텀 필터입니다.
- 로그인 요청 처리와 인증 성공 처리, 인증 실패 처리를 담당합니다.

```java
public JwtAuthenticationFilter(RefreshTokenRepository refreshTokenRepository, MemberSkillRepository memberSkillRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.memberSkillRepository = memberSkillRepository;
        setFilterProcessesUrl("/api/login");
}
```
/api/login 호출 시 실행되도록 설정했습니다.

<br>

### 로그인 요청 처리
```java
@Override
public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws WrongLoginException {
	try {
	    // form으로 넘어온 값으로 member 객체를 생성
	    Member member = new ObjectMapper().readValue(request.getReader(), Member.class);
	
	    UsernamePasswordAuthenticationToken userToken =
		    new UsernamePasswordAuthenticationToken(member.getEmail(), member.getPassword());
	
	    this.setDetails(request, userToken);
	
	    // AuthenticationManager 에 인증을 위임한다.
	    return getAuthenticationManager().authenticate(userToken);
	} catch (IOException e) {
	    throw new AuthenticationServiceException("아이디와 비밀번호를 올바르게 입력해주세요.");
	}
}
```
사용자의 로그인 요청을 처리하는 메서드입니다.  
사용자가 입력한  id, pw를 담아 UsernamePasswordAuthentication 객체를 생성합니다.  
생성된 인증 토큰은 AuthenticationManager 에게 전달되어 넘깁니다.  


### 인증 성공 처리
```java
@Override
protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain,
				    Authentication authResult) throws IOException, ServletException {
	// 1. 로그인 성공된 유저 조회
	Member member = ((CustomMemberDetails) authResult.getPrincipal()).getMember();
	
	// 2. Refresh Token DB 저장 (해당 유저의 리프레시 토큰이 이미 존재한다면, 삭제 후 저장)
	String refreshToken = JwtUtil.createRefreshToken(member);
	Long refreshTokenId = saveRefreshToken(member, refreshToken);
	
	// 3. AccessToken 발급
	String accessToken = JwtUtil.createAccessToken(member, refreshTokenId);
	
	LoginResponse loginResponse = new LoginResponse(accessToken);
	
	ResponseUtil.createResponseBody(response, loginResponse, HttpStatus.OK);
}
```

인증 성공 시 호출되는 메서드로, 인증된 사용자 정보를 가지고 리프레시 토큰을 생성, DB에 저장합니다.  
엑세스 토큰을 생성하고 클라이언트에게 로그인 성공(200) 응답과 함께 엑세스 토큰을 반환합니다.  
<br>
### 인증 실패 처리 
```java
@Override
protected void unsuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response, AuthenticationException failed) throws IOException, ServletException {
	BaseErrorResponse errorResponse = new BaseErrorResponse("email, password 가 일치하지 않습니다.");
	ResponseUtil.createResponseBody(response, errorResponse, HttpStatus.BAD_REQUEST);
}
```
인증이 실패했을 때 호출되는 메서드로, 인증 실패에 대한 오류를 응답으로 반환합니다.
<br>

### JwtAuthenticationProvider
AuthenticationProvider 를 커스텀하게 구현한 클래스입니다

```java
@RequiredArgsConstructor
public class JwtAuthenticationProvider implements AuthenticationProvider {

    private final CustomMemberDetailsService customMemberDetailsService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        UsernamePasswordAuthenticationToken token = (UsernamePasswordAuthenticationToken) authentication;

        String email = token.getName();
        String password = token.getCredentials().toString();

        CustomMemberDetails savedMember = (CustomMemberDetails) customMemberDetailsService.loadUserByUsername(email);

        if (!passwordEncoder.matches(password, savedMember.getPassword())) {
            throw new BadCredentialsException("로그인 정보가 올바르지 않습니다.");
        }

        return new UsernamePasswordAuthenticationToken(savedMember, password, savedMember.getAuthorities());
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return authentication.equals(UsernamePasswordAuthenticationToken.class);
    }
}
```

AuthenticationFilter -> AuthenticationManager -> AuthenticationProvider로 인증 로직을 위임합니다.

#### authenticate()

- 인증 메서드로 실제 인증 과정을 처리합니다. A.T(엑세스토큰)을 매개변수로 받아 사용자가 제공한 email, pw를 추출합니다.
- CustomMemberDetails 객체를 데이터베이스에서 가져옵니다. (사용자 상세 정보)
- 비밀번호가 맞는지 확인합니다. 일치하면 새로운 권한과 함께 새로운 UsernamePasswordAuthenticationToken 객체를 생성하고 반환합니다.
---
<br>
Security 에서 다루는 유저 정보(UserDetails)와 실제 Domain Entity 사이에 차이가 있기 때문에,  
UserDetails 를 구현한 클래스를 다음과 같이 정의해줍니다.  

## CustomMemberDetails
```java
@Getter
public class CustomMemberDetails implements UserDetails {

    private Member member;

    public CustomMemberDetails(Member member) {
        this.member = member;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Collection<GrantedAuthority> authorities = new ArrayList<>();

        Role role = member.getRoles();
        authorities.add(new SimpleGrantedAuthority(role.name()));

        return authorities;
    }
}
```
<br>

### CustomMemberDeatilsService
```java
@Service
@RequiredArgsConstructor
public class CustomMemberDetailsService implements UserDetailsService {
    private final MemberRepository memberRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return memberRepository.findByEmailAndProvider(username, "normal")
                .map(CustomMemberDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다. 이메일: " + username));
    }
}
```

Member의 provider 필드는 소셜로그인 시에 같이 쓰이는 값입니다. ("naver", "google"....)  
이메일은 겹칠 수 있기 때문에 user.findByEmail()은 쓰면 안 됩니다. Provider 값도 함께 확인하는 작업이 필수!  


loadUserByUsername()으로 UserDetails 객체를 반환합니다. (여기서는 CustomMemberDetails)  

### JwtAuthorizationFilter
시큐리티의 BasicAuthenticationFilter를 상속받아 특정 요청에 대해 JWT 기반의 인증 및 인가를 수행하는 필터입니다.

(너무 길어서 코드는 뺐습니다..!)

기능  
- 예외 URL 확인 : 특정 URL 패턴을 인증 과정에서 제외합니다.
- 엑세스 토큰 확인 : 요청 헤더(Authorization) 에서 엑세스 토큰을 추출합니다.
- 추출한 엑세스 토큰의 유효성을 검사합니다. 만료되었거나 잘못된 형식인 경우에는 오류를 발생시킵니다.
- 엑세스 토큰이 만료되었을 경우 JWT 클레임에서 refresh_token ID를 추출해 해당 멤버의 리프레시 토큰의 유효성을 확인합니다. 유효한 경우 엑세스토큰을 재발급하며 리프레시 토큰 역시 만료된 경우 재인증을 요구합니다.
- 사용자 인증 정보를 SecurityContextHolder에 저장합니다.

엑세스 토큰의 유효성을 검사하고 만료된 경우, 엑세스 토큰을 재발급합니다.  
<br>
<br>

## 느낀 점  
스프링 시큐리티의 동작 원리를 배워 실제로 적용해 보았습니다.  
그동안 개발 과정에서 보안을 등한시 했던 게 아닌지 반성하였고, 시프링 시큐리티를 통해 필터에서 보안 관련 처리를 하여 인증/인가 과정을 대략적으로 알 수 있었습니다.

AuthorizationFilter 에서 JWT 관련 처리를 모두 담당하고 있는데 코드가 길고, 지저분해 추후에 리팩토링 할 예정입니다.  
또한 리프레시 토큰을 DB에 저장해두는데, 더 효과적인 방법은 없는지 고민하고 있습니다

