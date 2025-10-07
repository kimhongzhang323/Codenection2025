package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.JwtService;
import com.example.AutoDocX.util.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Authentication Controller
 * Handles all authentication-related endpoints under /api/auth
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtService jwtService;

    /**
     * OAuth success handler - called after successful GitHub OAuth
     */
    @GetMapping("/oauth/success")
    public void handleOAuthSuccess(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof OAuth2User) {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            
            // Extract user information
            String userId = oauth2User.getAttribute("id").toString();
            String email = oauth2User.getAttribute("email");
            String name = oauth2User.getAttribute("name");
            String username = oauth2User.getAttribute("login");
            
            // Generate JWT token
            String token = jwtService.generateToken(userId, email, name);
            
            // Redirect to frontend with authentication data in URL fragment
            String redirectUrl = String.format(
                "%s#token=%s&user=%s&username=%s&status=success",
                getFrontendUrl(request),
                token,
                userId,
                username != null ? username : ""
            );
            
            response.sendRedirect(redirectUrl);
        } else {
            // Authentication failed
            String redirectUrl = getFrontendUrl(request) + "#status=error&message=authentication_failed";
            response.sendRedirect(redirectUrl);
        }
    }

    /**
     * Validate JWT token
     */
    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateToken(@RequestBody TokenValidationRequest request) {
        try {
            boolean isValid = jwtService.validateToken(request.getToken(), request.getUserId());
            
            if (isValid) {
                String email = jwtService.extractEmail(request.getToken());
                Map<String, Object> data = new HashMap<>();
                data.put("valid", true);
                data.put("email", email);
                data.put("userId", request.getUserId());
                
                return ResponseEntity.ok(ApiResponse.success("Token is valid", data));
            } else {
                Map<String, Object> data = new HashMap<>();
                data.put("valid", false);
                
                return ResponseEntity.ok(ApiResponse.success("Token is invalid", data));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Token validation failed: " + e.getMessage()));
        }
    }

    /**
     * Get current user information
     */
    @GetMapping("/user")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            String email = jwtService.extractEmail(token);
            
            if (jwtService.isTokenExpired(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Token expired"));
            }
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("userId", userId);
            userData.put("email", email);
            
            return ResponseEntity.ok(ApiResponse.success("User data retrieved", userData));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid token"));
        }
    }

    /**
     * Logout user
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null) {
            new SecurityContextLogoutHandler().logout(request, response, authentication);
        }
        
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    /**
     * Get frontend URL based on environment or request
     */
    private String getFrontendUrl(HttpServletRequest request) {
        // Check for environment variable first
        String frontendUrl = System.getenv("FRONTEND_URL");
        if (frontendUrl != null && !frontendUrl.isEmpty()) {
            return frontendUrl + "/dashboard";
        }
        
        // Fallback to request-based detection
        String host = request.getHeader("Host");
        if (host != null && host.contains("localhost")) {
            return "http://localhost:5173/dashboard";
        }
        
        // Default to production URL
        return "https://autodocx-beta.vercel.app/dashboard";
    }

    /**
     * Request DTOs
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenValidationRequest {
        private String token;
        private String userId;
    }
}
