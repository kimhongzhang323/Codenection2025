package com.example.AutoDocX.service.impl;

import com.example.AutoDocX.model.User;
import com.example.AutoDocX.repository.UserRepository;
import com.example.AutoDocX.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * User Service Implementation
 * Implements user-related business logic
 */
@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public Optional<User> findByGithubId(String githubId) {
        return userRepository.findByGithubId(githubId);
    }

    @Override
    @Transactional
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(User user) {
        // @PreUpdate annotation in User entity handles updatedAt automatically
        return userRepository.save(user);
    }
}

