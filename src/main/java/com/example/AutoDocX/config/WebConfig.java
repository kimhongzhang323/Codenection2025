package com.example.AutoDocX.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final LoggingInterceptor loggingInterceptor;

    public WebConfig(LoggingInterceptor loggingInterceptor) {
        this.loggingInterceptor = loggingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loggingInterceptor);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Get allowed origins from environment variable or use defaults
        String allowedOrigins = System.getenv("ALLOWED_ORIGINS");
        String[] origins;
        
        if (allowedOrigins != null && !allowedOrigins.isEmpty()) {
            origins = allowedOrigins.split(",");
        } else {
            // Default development origins
            origins = new String[]{
                "http://localhost:3000", 
                "http://localhost:5173", 
                "http://localhost:4173", 
                "http://127.0.0.1:3000", 
                "http://127.0.0.1:5173", 
                "http://127.0.0.1:4173",
                "https://autodocx-beta.vercel.app"
            };
        }
        
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
