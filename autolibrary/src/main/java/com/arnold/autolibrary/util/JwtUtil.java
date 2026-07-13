package com.arnold.autolibrary.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private Key getSigningKey(){
        return Keys.hmacShaKeyFor(secret.getBytes());
    }


    public String generateToken(String userName,String role , int userId){
        Map<String,Object>claims = new HashMap<>();
        claims.put("role",role);
        claims.put("userId",userId);

        return Jwts.builder().setClaims(claims).setSubject(userName)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis()+ expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUserName(String token) {
        return extractAllClaims(token).getSubject();
    }
    public String extractRole(String token){
        return extractAllClaims(token).get("role",String.class);
    }



    public int extractUserId(String token){
        return extractAllClaims(token).get("userId",Integer.class);
    }

    public boolean isTokenExpired(String token){
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    public boolean validateToken(String token,String userName){
        String extractedUserName = extractUserName(token);
        return extractedUserName.equals(userName)&& isTokenExpired(token);

    }

    private Claims extractAllClaims(String token) {

            return Jwts.parserBuilder().setSigningKey(getSigningKey())
                    .build().parseClaimsJws(token).getBody();


    }
}
