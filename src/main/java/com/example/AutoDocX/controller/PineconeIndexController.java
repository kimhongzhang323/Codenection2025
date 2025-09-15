package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.PineconeIndexService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pinecone")
public class PineconeIndexController {

    private static final Logger log = LoggerFactory.getLogger(PineconeIndexController.class);

    private final PineconeIndexService pineconeService;

    public PineconeIndexController(PineconeIndexService pineconeService) {
        this.pineconeService = pineconeService;
    }

    @PostMapping("/testing")
    public ResponseEntity<?> upsertFromText(
            @RequestBody UpsertRequest request) {

        try {
            pineconeService.upsertTextVectors(request.getIds(), request.getTexts());
            return ResponseEntity.ok().body("Upsert request dispatched successfully.");
        } catch (IllegalArgumentException e) {
            log.warn("Bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error while upserting vectors", e);
            return ResponseEntity.status(500).body("Internal server error");
        }
    }

    public static class UpsertRequest {
        private List<String> ids;
        private List<String> texts;

        public List<String> getIds() {
            return ids;
        }

        public void setIds(List<String> ids) {
            this.ids = ids;
        }

        public List<String> getTexts() {
            return texts;
        }

        public void setTexts(List<String> texts) {
            this.texts = texts;
        }
    }
}
