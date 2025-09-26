package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.User;
import com.example.AutoDocX.service.JwtService;
import com.example.AutoDocX.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        // Handle bearer token authentication
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String userId = jwtService.extractUserId(token);
                if (jwtService.validateToken(token, userId)) {
                    Optional<User> userOptional = userService.findByGithubId(userId);
                    if (userOptional.isPresent()) {
                        User user = userOptional.get();
                        Map<String, Object> response = new HashMap<>();
                        response.put("user", user);
                        response.put("token", token);
                        return ResponseEntity.ok(response);
                    }
                }
            } catch (Exception e) {
                System.err.println("Token validation error: " + e.getMessage());
            }
            return ResponseEntity.status(401).build();
        }
        
        // Handle OAuth2 authentication
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userService.processOAuth2User(principal);
        String token = jwtService.generateToken(user.getGithubId(), user.getEmail(), user.getName());

        Map<String, Object> response = new HashMap<>();
        response.put("user", user);
        response.put("token", token);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/success")
    public void authenticationSuccess(@AuthenticationPrincipal OAuth2User principal, 
                                     HttpServletResponse response,
                                     @RequestParam(defaultValue = "http://localhost:5173/dashboard") String redirect_uri) throws IOException {
        
        if (principal != null) {
            try {
                // Process OAuth2 user and save to database
                User user = userService.processOAuth2User(principal);
                
                // Generate JWT token for the authenticated user
                String token = jwtService.generateToken(user.getGithubId(), user.getEmail(), user.getName());
                
                // Validate user identity as recommended by GitHub documentation
                Object githubIdAttr = principal.getAttribute("id");
                Object usernameAttr = principal.getAttribute("login");
                String githubId = githubIdAttr != null ? githubIdAttr.toString() : "";
                String username = usernameAttr != null ? usernameAttr.toString() : "";
                
                // Store authentication data in URL fragment for direct dashboard access
                String redirectUrl = String.format("%s#token=%s&user=%s&username=%s&status=success", 
                    redirect_uri, token, githubId, username);
                
                response.sendRedirect(redirectUrl);
            } catch (Exception e) {
                // Log the error and redirect to sign-in page with error
                System.err.println("OAuth processing error: " + e.getMessage());
                String redirectUrl = "http://localhost:5173/sign-in?error=processing_failed&message=" + e.getMessage();
                response.sendRedirect(redirectUrl);
            }
        } else {
            // No authenticated user - redirect to sign-in page with error
            String redirectUrl = "http://localhost:5173/sign-in?error=authentication_failed&message=No user authenticated";
            response.sendRedirect(redirectUrl);
        }
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String userId = request.get("userId");

        if (token == null || userId == null) {
            return ResponseEntity.badRequest().build();
        }

        boolean isValid = jwtService.validateToken(token, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("valid", isValid);

        if (isValid) {
            String email = jwtService.extractEmail(token);
            response.put("email", email);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/github-info")
    public ResponseEntity<Map<String, Object>> getGitHubOAuthInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("authorization_url", "https://github.com/login/oauth/authorize");
        info.put("client_id", "Ov23liSmyDE5Z9cTon02");
        info.put("scopes", new String[]{"read:user", "user:email"});
        info.put("redirect_uri", "http://localhost:8081/login/oauth2/code/github");
        return ResponseEntity.ok(info);
    }
}
