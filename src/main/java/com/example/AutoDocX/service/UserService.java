package com.example.AutoDocX.service;

import com.example.AutoDocX.model.User;

import java.util.Optional;

/**
 * User Service Interface
 * Defines user-related business logic operations
 */
public interface UserService {

    /**
     * Find user by GitHub ID
     * @param githubId The GitHub user ID
     * @return Optional containing the user if found
     */
    Optional<User> findByGithubId(String githubId);

    /**
     * Save a new user or update existing user
     * @param user The user to save
     * @return The saved user
     */
    User saveUser(User user);

    /**
     * Update existing user information
     * @param user The user with updated information
     * @return The updated user
     */
    User updateUser(User user);
}

