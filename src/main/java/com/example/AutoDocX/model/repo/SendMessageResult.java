package com.example.AutoDocX.model.repo;

import lombok.Getter;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Getter
public class SendMessageResult {
    private final ModelFinishReason modelFinishReason;
    private final Optional<String> assistantText;  // any natural language text the model output
    private final List<FunctionCallData> functionCalls;  // zero or more tool calls
    private final Optional<String> finalAnswer;  // populated if no functionCalls and text is final answer
    private final Optional<String> errorMessage; // if any error

    public SendMessageResult(
            ModelFinishReason modelFinishReason,
            Optional<String> assistantText,
            List<FunctionCallData> functionCalls,
            Optional<String> finalAnswer,
            Optional<String> errorMessage
    ) {
        this.modelFinishReason = modelFinishReason;
        this.assistantText = assistantText;
        this.functionCalls = functionCalls;
        this.finalAnswer = finalAnswer;
        this.errorMessage = errorMessage;
    }

    // For backwards compatibility: toMap()
    public Map<String, Object> toMap() {
        var m = new java.util.HashMap<String, Object>();
        m.put("finish_reason", modelFinishReason.name());
        assistantText.ifPresent(text -> m.put("assistant_text", text));
        if (!functionCalls.isEmpty()) {
            List<Map<String, Object>> fcList = new java.util.ArrayList<>();
            for (FunctionCallData fc : functionCalls) {
                var fm = new java.util.HashMap<String, Object>();
                fm.put("name", fc.getName());
                fm.put("args", fc.getArgs());
                fcList.add(fm);
            }
            m.put("function_calls", fcList);
        }
        finalAnswer.ifPresent(ans -> m.put("final_answer", ans));
        errorMessage.ifPresent(err -> m.put("error", err));
        return m;
    }
}
