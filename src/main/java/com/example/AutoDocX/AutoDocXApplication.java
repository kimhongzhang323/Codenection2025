package com.example.AutoDocX;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class })
public class AutoDocXApplication {
    public static void main(String[] args) {
        SpringApplication.run(AutoDocXApplication.class, args);
    }
}
