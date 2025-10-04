package com.example.AutoDocX.service;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public static ResponseEntity<String> errorResponseEntity(String message, HttpStatus status) {
      return new ResponseEntity<>(message, status);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        return errorResponseEntity(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<String> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException ex) {
        String requiredType = "unknown type";
        try {
            if (ex.getRequiredType() != null) {
                requiredType = ex.getRequiredType().getSimpleName();
            }
        } catch (Exception e) {
            // Fallback if getRequiredType() fails
            requiredType = "unknown type";
        }
        String message = "Invalid parameter: " + ex.getValue() + " cannot be converted to " + requiredType;
        return errorResponseEntity(message, HttpStatus.BAD_REQUEST);
    }
}
