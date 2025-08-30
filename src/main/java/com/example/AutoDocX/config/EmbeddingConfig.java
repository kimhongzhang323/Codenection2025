package com.example.AutoDocX.config;

import ai.djl.ModelException;
import ai.djl.huggingface.tokenizers.Encoding;
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
import ai.djl.inference.Predictor;
import ai.djl.ndarray.NDArray;
import ai.djl.ndarray.NDList;
import ai.djl.ndarray.NDManager;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.training.util.ProgressBar;
import ai.djl.translate.TranslateException;
import ai.djl.translate.Translator;
import ai.djl.translate.TranslatorContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.util.concurrent.Semaphore;

@Configuration
public class EmbeddingConfig {

    private static final int MAX_CONCURRENT_REQUESTS = 5; // adjust to your server capacity
    private final Semaphore semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

    @Bean(destroyMethod = "close")
    public PredictorWrapper embeddingPredictor() throws IOException, ModelException {
        Criteria<String, float[]> criteria = Criteria.builder()
                .setTypes(String.class, float[].class)
                .optModelUrls("file:src/main/resources/graphcodebert.pt")
                .optTranslator(new FeatureExtractionTranslator())
                .optEngine("PyTorch")
                .optProgress(new ProgressBar())
                .build();

        ZooModel<String, float[]> model = criteria.loadModel();
        Predictor<String, float[]> predictor = model.newPredictor();

        return new PredictorWrapper(predictor, semaphore);
    }


    public static class PredictorWrapper implements AutoCloseable {

        private final Predictor<String, float[]> delegate;
        private final Semaphore semaphore;

        PredictorWrapper(Predictor<String, float[]> delegate, Semaphore semaphore) {
            this.delegate = delegate;
            this.semaphore = semaphore;
        }

        public float[] predict(String input) throws TranslateException {
            try {
                if (!semaphore.tryAcquire()) {
                    throw new RuntimeException("Too many requests. Please try again later.");
                }
                return delegate.predict(input);
            } finally {
                semaphore.release();
            }
        }

        @Override
        public void close() {
            delegate.close();
        }
    }

    static class FeatureExtractionTranslator implements Translator<String, float[]> {

        private HuggingFaceTokenizer tokenizer;

        @Override
        public void prepare(TranslatorContext ctx) throws Exception {
            tokenizer = HuggingFaceTokenizer.newInstance("microsoft/graphcodebert-base");
        }

        @Override
        public NDList processInput(TranslatorContext ctx, String input) {
            Encoding encoding = tokenizer.encode(input);

            long[] inputIdsArr = encoding.getIds();
            long[] attentionMaskArr = encoding.getAttentionMask();
            long[] tokenTypeIdsArr = encoding.getTypeIds();

            NDManager manager = ctx.getNDManager();
            NDArray inputIds = manager.create(inputIdsArr).expandDims(0);
            NDArray attentionMask = manager.create(attentionMaskArr).expandDims(0);
            NDArray tokenTypeIds = manager.create(tokenTypeIdsArr).expandDims(0);

            inputIds.setName("input_ids");
            attentionMask.setName("attention_mask");
            tokenTypeIds.setName("token_type_ids");

            return new NDList(inputIds, attentionMask, tokenTypeIds);
        }

        @Override
        public float[] processOutput(TranslatorContext ctx, NDList list) {
            NDArray lastHiddenState = list.get(0); // [batch, seq_len, hidden_size]
            NDArray pooled = lastHiddenState.mean(new int[]{1}); // mean pooling
            return pooled.toFloatArray();
        }
    }
}
