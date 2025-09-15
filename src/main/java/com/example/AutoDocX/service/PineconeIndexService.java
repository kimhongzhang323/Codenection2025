package com.example.AutoDocX.service;

import io.pinecone.clients.Index;
import io.pinecone.clients.Pinecone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;

@Service
public class PineconeIndexService {

    private static final Logger logger = LoggerFactory.getLogger(PineconeIndexService.class);

    private final Pinecone pineconeClient;
    private final String indexName = "codenection";
    private final String namespace = "default";

    private static final int MAX_CONCURRENT_REQUESTS = 3;
    private static final int BATCH_SIZE = 50;
    private static final int QUEUE_CAPACITY = 1000;
    private final ExecutorService executor;

    public PineconeIndexService(Pinecone pineconeClient) {
        this.pineconeClient = pineconeClient;
        this.executor = new ThreadPoolExecutor(
                MAX_CONCURRENT_REQUESTS,
                MAX_CONCURRENT_REQUESTS,
                0L,
                TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(QUEUE_CAPACITY),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    public void upsertTextVectors(List<String> ids, List<String> texts) {
        if (ids.size() != texts.size()) {
            throw new IllegalArgumentException("IDs and texts size mismatch");
        }
        for (int start = 0; start < ids.size(); start += BATCH_SIZE) {
            int end = Math.min(start + BATCH_SIZE, ids.size());
            List<String> batchIds = ids.subList(start, end);
            List<String> batchTxt = texts.subList(start, end);
            executor.submit(() -> doUpsertWithText(batchIds, batchTxt));
        }
    }

    private void doUpsertWithText(List<String> ids, List<String> texts) {
        try {
            Index index = pineconeClient.getIndexConnection(indexName);
            List<Map<String, String>> upsertRecords = new ArrayList<>();

            for (int i = 0; i < ids.size(); i++) {
                Map<String, String> record = new HashMap<>();
                record.put("_id", ids.get(i));
                record.put("text", texts.get(i));
                record.put("type", "code");
                upsertRecords.add(record);
            }

            index.upsertRecords(namespace, upsertRecords);
            logger.info("Upserted {} text/code records into index {}", ids.size(), indexName);
        } catch (Exception e) {
            logger.error("Error upserting text/code records into index '{}': {}", indexName, e.getMessage(), e);
        }
    }


    public void shutdown() {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
    }
}
