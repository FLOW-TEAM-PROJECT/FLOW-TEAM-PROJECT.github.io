---
emoji: ☁️
title: Nginx CORS + https 설정 문제 해결하기
date: '2024-02-20 00:00:00'
author: 유희진
tags: DevOps
categories: DevOps
---

Nginx 기존 설정 파일은 아래와 같다.

```
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server localhost:8080;
    }

    server {
        listen 80;

        location /api {
            proxy_pass http://backend/api;
            add_header 'Access-Control-Allow-Origin' '*';
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Origin "";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
        }
    }
}
```

하지만 원인을 알 수 없는 CORS 오류가 자꾸 발생했다.

```
Access to XMLHttpRequest at 
'http:///api/email- join:1 verifications' 
from origin "http://localhost:3000' has been blocked by CORS policy: 
Request header field content-type is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

Frontend, Backend 코드 모두 뜯어보고 고쳐보았으나 전혀 방법이 없었는데, **시험 삼아 nginx를 거치지 않고 요청을 보내보니 잘 전송되는 것을 확인할 수 있었다. 😨**

즉, CORS의 원인은 nginx 때문이었던 것!

## nginx CORS 오류 수정하기

1. 처음에 `Access-Control-Allow-Origin` 옵션을 적용할 경우 원본 서버의 헤더가 있는 경우 `proxy_hide_header Access-Control-Allow-Origin;` 을 추가하면 해결된다고 하여 추가했다.
    
    ```
    location /api {
    	    proxy_pass http://backend/api;
    			proxy_hide_header Access-Control-Allow-Origin;
    	    add_header 'Access-Control-Allow-Origin' '*';
    	    proxy_http_version 1.1;
    	    proxy_set_header Upgrade $http_upgrade;
    	    proxy_set_header Connection "upgrade";
    	    proxy_set_header Origin "";
    	    proxy_set_header X-Real-IP $remote_addr;
    	    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    	    proxy_set_header Host $http_host;
    }
    ```
    
2. 하지만, CORS오류는 여전히 해결되지 않았고, 아래와 같이 와일드 카드를 제거하고 `withCredentials` 옵션을 추가했다. (이 옵션은 추후 쿠키 사용을 위해 추가한 것도 있다.)
    
    ```
    events {
        worker_connections 1024;
    }
    
    http {
        upstream backend {
            server localhost:8080;
        }
    
        server {
            listen 80;
    
            location /api {
                proxy_pass http://backend/api;
                add_header 'Access-Control-Allow-Credentials' 'true';
                add_header 'Access-Control-Allow-Origin' 'http://localhost:3000';
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Origin "";
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
            }
        }
    }
    ```
    
    ~~그러나 여전히 해결되지 않았다………ㅠ_ㅠ~~
    
3. 위 오류 메세지를 다시 참고했는데, Request header field content-type is not allowed by Access-Control-Allow-Headers 
in **preflight response. 즉, preflight 요청 시 발생하는 문제인 것 같다는 생각이 들어 preflight 요청 시 사용하는 OPTIONS 메소드로 요청이 들어왔을 때 아래와 같이 설정했다.**
    
    ```
    if ($request_method = 'OPTIONS') {
    	    add_header 'Access-Control-Allow-Origin' $allowed_origin always;
    	    add_header 'Access-Control-Allow-Methods' 'GET, POST, DELETE, PATCH, OPTIONS';
    	    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
    	    add_header 'Access-Control-Allow-Credentials' 'true';
    	    return 204;
    }
    ```
    
4. 결과적으로 아주 잘 동작했다!
    
    ```
    events {
        worker_connections 1024;
    }
    
    http {
        upstream backend {
            server localhost:8080;
        }
    
        server {
            listen 80;
    
            location /api {
                if ($request_method = 'OPTIONS') {
                    add_header 'Access-Control-Allow-Origin' 'http://localhost:3000';
                    add_header 'Access-Control-Allow-Methods' 'GET, POST, DELETE, PATCH, OPTIONS';
                    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
                    add_header 'Access-Control-Allow-Credentials' 'true';
                    return 204;
                }
    
                proxy_pass http://backend/api;
                add_header 'Access-Control-Allow-Credentials' 'true';
                add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Origin "";
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
            }
        }
    }
    ```
    

## nginx 여러 도메인의 요청 허용하기

우리 팀은 vercel을 이용해 배포하기 때문에 localhost뿐만 아니라 vercel 주소도 따로 추가해야했다.

그래서 아무 생각 없이 아래처럼 설정 파일을 수정했다. (당연히 안됐다..^_^)

```
add_header 'Access-Control-Allow-Origin' 'http://localhost:3000, https://devridge-client.vercel.app';
```

nginx는 Access-Control-Allow-Origin 옵션은 하나밖에 설정이 안된다고 한다.

그래서 여러 도메인을 허용하려면 동적으로 설정하면 된다고 한다.

```
map $http_origin $allowed_origin {
    default "";
    "http://localhost:3000" $http_origin;
    "https://devridge-client.vercel.app" $http_origin;
}

add_header 'Access-Control-Allow-Origin' $allowed_origin always;
```

## https 설정하기

우리 팀은 무중단 배포 때문에 nginx를 blue버전과 green 버전 두 가지로 나누어 사용하고 있었고, https의 경우 certbot을 사용하고 있었다.

이로 인해 애플리케이션이 새로 배포될 때마다 nginx 설정 파일이 바뀌기 때문에 https 인증이 풀리는 문제가 발생한다.

1. 처음에 배포 스크립트에 `sudo certbot renew --nginx` 를 추가하면 될 줄 알았으나 여전히 동작하지 않았다.
2. `nginx.conf` 파일 자체를 보니 https 설정 시 아래와 같은 코드가 추가되는 것을 확인했다.
    
    ```
    server_name devridge6.duckdns.org;
    
    listen 443 ssl; # managed by Certbot
          ssl_certificate /etc/letsencrypt/live/devridge6.duckdns.org/fullchain.pem; # managed by Certbot
          ssl_certificate_key /etc/letsencrypt/live/devridge6.duckdns.org/privkey.pem; # managed by Certbot
          include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
          ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
    }
    
    server {
    		  if ($host = devridge6.duckdns.org) {
    		           return 301 https://$host$request_uri;
    		  } # managed by Certbot
    		
    		  server_name devridge6.duckdns.org;
    		  listen 80;
    		  return 404; # managed by Certbot
    }
    ```
    
3. 위 코드를 참고하여 nginx.blue.conf, nginx.green.conf에 위 코드를 복사/붙여넣기 하고 배포 스크립트를 설정하니 https가 끊기지 않고 잘 동작하는 것을 확인할 수 있다!
    
    ```
    events {
        worker_connections 1024;
    }
    
    http {
        map $http_origin $allowed_origin {
            default "";
            "http://localhost:3000" $http_origin;
            "https://devridge-client.vercel.app" $http_origin;
        }
    
        upstream backend {
            server localhost:8080;
        }
    
        server {
    
            server_name devridge6.duckdns.org;
    
            location /api {
                if ($request_method = 'OPTIONS') {
                    add_header 'Access-Control-Allow-Origin' $allowed_origin always;
                    add_header 'Access-Control-Allow-Methods' 'GET, POST, DELETE, PATCH, OPTIONS';
                    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
                    add_header 'Access-Control-Allow-Credentials' 'true';
                    return 204;
                }
    
                proxy_pass http://backend/api;
                add_header 'Access-Control-Allow-Origin' $allowed_origin always;
                add_header 'Access-Control-Allow-Credentials' 'true';
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Origin "";
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
            }
    
            listen 443 ssl; # managed by Certbot
            ssl_certificate /etc/letsencrypt/live/devridge6.duckdns.org/fullchain.pem; # managed by Certbot
            ssl_certificate_key /etc/letsencrypt/live/devridge6.duckdns.org/privkey.pem; # managed by Certbot
            include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
            ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
        }
    
        server {
            if ($host = devridge6.duckdns.org) {
                     return 301 https://$host$request_uri;
            } # managed by Certbot
    
            server_name devridge6.duckdns.org;
            listen 80;
            return 404; # managed by Certbot
        }
    }
    ```
    

최종적으로 설정한 nginx 파일은 아래와 같다.

```
events {
    worker_connections 1024;
}

http {
    map $http_origin $allowed_origin {
        default "";
        "http://localhost:3000" $http_origin;
        "https://devridge-client.vercel.app" $http_origin;
    }

    upstream backend {
        server localhost:8080;
    }

    server {

        server_name devridge6.duckdns.org;

        location /api {
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' $allowed_origin always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, DELETE, PATCH, OPTIONS';
                add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
                add_header 'Access-Control-Allow-Credentials' 'true';
                return 204;
            }

            proxy_pass http://backend/api;
            add_header 'Access-Control-Allow-Origin' $allowed_origin always;
            add_header 'Access-Control-Allow-Credentials' 'true';
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Origin "";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
        }

        listen 443 ssl; # managed by Certbot
        ssl_certificate /etc/letsencrypt/live/devridge6.duckdns.org/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/devridge6.duckdns.org/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
    }

    server {
        if ($host = devridge6.duckdns.org) {
                 return 301 https://$host$request_uri;
        } # managed by Certbot

        server_name devridge6.duckdns.org;
        listen 80;
        return 404; # managed by Certbot
    }
}
```

## 참고 자료

- https://bobbyhadz.com/blog/the-value-of-the-access-control-allow-origin-header-in-the-response
- https://greeng00se.tistory.com/119
- https://www.juannicolas.eu/how-to-set-up-nginx-cors-multiple-origins/
- https://sasohan.github.io/2022/09/08/enable-corss-origin-cors-in-nginx/
- https://jay-ji.tistory.com/72
- https://sedangdang.tistory.com/301
- https://codedbyjst.tistory.com/13
