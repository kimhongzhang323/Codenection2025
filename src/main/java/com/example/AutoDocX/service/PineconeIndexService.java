package com.example.AutoDocX.service;

import io.pinecone.clients.Index;
import io.pinecone.clients.Pinecone;
import io.pinecone.proto.UpsertResponse;
import io.pinecone.unsigned_indices_model.VectorWithUnsignedIndices;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static io.pinecone.commons.IndexInterface.buildUpsertVectorWithUnsignedIndices;

@Service
public class PineconeIndexService {

    private static final Logger logger = LoggerFactory.getLogger(PineconeIndexService.class);

    private final Pinecone pineconeClient;
    private final String indexName = "autodocx";

    private static final int MAX_CONCURRENT_REQUESTS = 3;
    private static final int BATCH_SIZE = 50;
    private static final int QUEUE_CAPACITY = 1000;
    private final ExecutorService executor;

    public PineconeIndexService(Pinecone pineconeClient) {
        this.pineconeClient = pineconeClient;

        // Bounded thread pool with backpressure
        this.executor = new ThreadPoolExecutor(
                MAX_CONCURRENT_REQUESTS,
                MAX_CONCURRENT_REQUESTS,
                0L,
                TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(QUEUE_CAPACITY),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    public void upsertVectors(List<String> ids, List<List<Float>> embeddings) {
        if (ids.size() != embeddings.size()) {
            throw new IllegalArgumentException("IDs and embeddings size mismatch");
        }

        for (int start = 0; start < ids.size(); start += BATCH_SIZE) {
            int end = Math.min(start + BATCH_SIZE, ids.size());
            List<String> batchIds = ids.subList(start, end);
            List<List<Float>> batchEmbeddings = embeddings.subList(start, end);

            executor.submit(() -> {
                try {
                    doUpsert(batchIds, batchEmbeddings);
                } catch (Exception e) {
                    logger.error("Batch upsert failed: {}", e.getMessage(), e);
                }
            });
        }
    }

    private void doUpsert(List<String> ids, List<List<Float>> embeddings) {
        try {
            Index index = pineconeClient.getIndexConnection(indexName);

            List<VectorWithUnsignedIndices> vectors = new ArrayList<>();
            for (int i = 0; i < ids.size(); i++) {
                vectors.add(
                        buildUpsertVectorWithUnsignedIndices(
                                ids.get(i),
                                embeddings.get(i),
                                null,
                                null,
                                null
                        )
                );
            }

            UpsertResponse response = index.upsert(vectors, "default");
            logger.info("Upserted {} vectors into index {}", ids.size(), indexName);
            logger.debug("Upsert response: {}", response);

        } catch (Exception e) {
            logger.error("Error upserting vectors into index '{}': {}", indexName, e.getMessage(), e);
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
