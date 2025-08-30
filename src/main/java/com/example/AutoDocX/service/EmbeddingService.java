package com.example.AutoDocX.service;

import com.example.AutoDocX.config.EmbeddingConfig.PredictorWrapper;
import org.springframework.stereotype.Service;

@Service
public class EmbeddingService {

    private final PredictorWrapper predictor;

    public EmbeddingService(PredictorWrapper predictor) {
        this.predictor = predictor;
    }

    public float[] embedCode(String codeSnippet) throws Exception {
        return predictor.predict(codeSnippet);
    }
}
