package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.User;
import com.example.AutoDocX.service.JwtService;
import com.example.AutoDocX.service.UserService;
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
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Authentication Controller
 * Handles all authentication-related endpoints under /api/auth
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserService userService;

    @Autowired
    private OAuth2AuthorizedClientService authorizedClientService;

    /**
     * OAuth failure handler
     */
    @GetMapping("/oauth/failure")
    public void handleOAuthFailure(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String redirectUrl = getFrontendUrl(request) + "#status=error&message=authentication_failed";
        response.sendRedirect(redirectUrl);
    }

    /**
     * OAuth success handler - called after successful GitHub OAuth
     */
    @GetMapping("/oauth/success")
    public void handleOAuthSuccess(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof OAuth2User) {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            
            // Extract user information from OAuth2User
            String githubId = oauth2User.getAttribute("id").toString();
            String email = oauth2User.getAttribute("email");
            String name = oauth2User.getAttribute("name");
            String username = oauth2User.getAttribute("login");
            String avatarUrl = oauth2User.getAttribute("avatar_url");
            
            // Extract GitHub access token
            String githubAccessToken = null;
            if (authentication instanceof OAuth2AuthenticationToken) {
                OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
                OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                    oauthToken.getAuthorizedClientRegistrationId(),
                    oauthToken.getName()
                );
                
                if (client != null && client.getAccessToken() != null) {
                    githubAccessToken = client.getAccessToken().getTokenValue();
                }
            }
            
            // Save or update user in database
            Optional<User> existingUser = userService.findByGithubId(githubId);
            User user;
            
            if (existingUser.isPresent()) {
                // Update existing user
                user = existingUser.get();
                user.setEmail(email);
                user.setName(name);
                user.setUsername(username);
                user.setAvatarUrl(avatarUrl);
                user.setGithubAccessToken(githubAccessToken);
                user = userService.updateUser(user);
            } else {
                // Create new user
                user = new User();
                user.setGithubId(githubId);
                user.setEmail(email);
                user.setName(name);
                user.setUsername(username);
                user.setAvatarUrl(avatarUrl);
                user.setGithubAccessToken(githubAccessToken);
                user = userService.saveUser(user);
            }
            
            // Generate JWT token
            String jwtToken = jwtService.generateToken(githubId, email, name);
            
            // Redirect to frontend with authentication data in URL fragment
            String redirectUrl = String.format(
                "%s#token=%s&user=%s&username=%s&github_token=%s&status=success",
                getFrontendUrl(request),
                jwtToken,
                githubId,
                username != null ? username : "",
                githubAccessToken != null ? githubAccessToken : ""
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
            String githubId = jwtService.extractUserId(token);
            String email = jwtService.extractEmail(token);
            
            if (jwtService.isTokenExpired(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Token expired"));
            }
            
            // Fetch user from database to get GitHub access token
            Optional<User> userOpt = userService.findByGithubId(githubId);
            
            Map<String, Object> response = new HashMap<>();
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", githubId);
            userData.put("githubId", githubId);
            userData.put("email", email);
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                userData.put("name", user.getName());
                userData.put("username", user.getUsername());
                userData.put("avatarUrl", user.getAvatarUrl());
                userData.put("accessToken", user.getGithubAccessToken());
            }
            
            response.put("user", userData);
            
            return ResponseEntity.ok(ApiResponse.success("User data retrieved", response));
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
