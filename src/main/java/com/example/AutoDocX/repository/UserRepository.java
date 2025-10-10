package com.example.AutoDocX.repository;

import com.example.AutoDocX.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * User Repository
 * Handles database operations for User entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by GitHub ID
     * @param githubId The GitHub user ID
     * @return Optional containing the user if found
     */
    Optional<User> findByGithubId(String githubId);

    /**
     * Find user by username
     * @param username The GitHub username
     * @return Optional containing the user if found
     */
    Optional<User> findByUsername(String username);
}

