package com.example.AutoDocX.service;

import com.example.AutoDocX.model.User;
import com.example.AutoDocX.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User processOAuth2User(OAuth2User oauth2User) {
        String githubId = oauth2User.getAttribute("id").toString();
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String username = oauth2User.getAttribute("login");
        String avatarUrl = oauth2User.getAttribute("avatar_url");

        Optional<User> existingUser = userRepository.findByGithubId(githubId);
        
        if (existingUser.isPresent()) {
            // Update existing user
            User user = existingUser.get();
            user.setEmail(email);
            user.setName(name);
            user.setUsername(username);
            user.setAvatarUrl(avatarUrl);
            return userRepository.save(user);
        } else {
            // Create new user
            User newUser = new User();
            newUser.setGithubId(githubId);
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setUsername(username);
            newUser.setAvatarUrl(avatarUrl);
            return userRepository.save(newUser);
        }
    }

    public Optional<User> findByGithubId(String githubId) {
        return userRepository.findByGithubId(githubId);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
