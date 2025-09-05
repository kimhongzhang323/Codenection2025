package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.SummarizerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/summarize")
public class SummarizeController {
    @Autowired
    SummarizerService service;

    @PostMapping
    public Map<String,String> summarize(@RequestBody Map<String,String> body) {
        String md = body.getOrDefault("markdown","");
        return Map.of("summary", service.summarize(md));
    }
}
