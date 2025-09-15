package com.example.AutoDocX.model.repo;

import lombok.Getter;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Getter
public class SendMessageResult {
    private final ModelFinishReason modelFinishReason;
    private final Optional<String> assistantText;  // any natural language text the model output
    private final List<ToolCallData> toolCalls;    // zero or more tool calls
    private final Optional<String> finalAnswer;    // populated if no functionCalls and text is final answer
    private final Optional<String> errorMessage;   // if any error

    public SendMessageResult(
            ModelFinishReason modelFinishReason,
            Optional<String> assistantText,
            List<ToolCallData> toolCalls,
            Optional<String> finalAnswer,
            Optional<String> errorMessage
    ) {
        this.modelFinishReason = modelFinishReason;
        this.assistantText = assistantText;
        this.toolCalls = toolCalls;
        this.finalAnswer = finalAnswer;
        this.errorMessage = errorMessage;
    }

    // For backwards compatibility: toMap()
    public Map<String, Object> toMap() {
        var m = new java.util.HashMap<String, Object>();
        m.put("finish_reason", modelFinishReason.name());
        assistantText.ifPresent(text -> m.put("assistant_text", text));
        if (!toolCalls.isEmpty()) {
            List<Map<String, Object>> fcList = new java.util.ArrayList<>();
            for (ToolCallData fc : toolCalls) {
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

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("SendMessageResult {\n");
        sb.append("  finishReason: ").append(modelFinishReason).append("\n");
        assistantText.ifPresent(text -> sb.append("  assistantText: ").append(text).append("\n"));
        if (!toolCalls.isEmpty()) {
            sb.append("  toolCalls:\n");
            for (ToolCallData fc : toolCalls) {
                sb.append("    - name: ").append(fc.getName())
                        .append(", args: ").append(fc.getArgs()).append("\n");
            }
        }
        finalAnswer.ifPresent(ans -> sb.append("  finalAnswer: ").append(ans).append("\n"));
        errorMessage.ifPresent(err -> sb.append("  errorMessage: ").append(err).append("\n"));
        sb.append("}");
        return sb.toString();
    }
}
