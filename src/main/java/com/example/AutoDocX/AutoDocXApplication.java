package com.example.AutoDocX;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class AutoDocXApplication {
    public static void main(String[] args) {
        SpringApplication.run(AutoDocXApplication.class, args);
    }
}
