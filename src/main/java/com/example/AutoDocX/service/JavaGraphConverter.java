package com.example.AutoDocX.service;

import com.example.AutoDocX.parser.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.ArrayList;

@Service
public class JavaGraphConverter {

    @Autowired
    private JavaTreeConverter javaTreeConverter;

    public Graph convertJavaTreeToGraph(List<JavaClass> javaClasses) {
        Graph graph = new Graph();
        Map<String, GraphNode> nodesMap = new HashMap<>();

        // First pass: create all nodes and add them to the map and graph
        for (JavaClass javaClass : javaClasses) {
            String classId = "class_" + javaClass.getName();
            nodesMap.computeIfAbsent(classId, k -> {
                GraphNode node = new GraphNode(classId, javaClass.getName(), GraphNode.NodeType.CLASS, javaClass.getFilePath(), javaClass.getStartLine(), javaClass.getEndLine(), new ArrayList<>(), new ArrayList<>());
                graph.addNode(node);
                return node;
            });

            for (JavaField field : javaClass.getFields()) {
                String fieldId = "field_" + classId + "_" + field.getName();
                nodesMap.computeIfAbsent(fieldId, k -> {
                    GraphNode node = new GraphNode(fieldId, field.getName(), GraphNode.NodeType.FIELD, field.getFilePath(), field.getStartLine(), field.getEndLine(), new ArrayList<>(), new ArrayList<>());
                    graph.addNode(node);
                    return node;
                });
            }

            for (JavaMethod method : javaClass.getMethods()) {
                String methodId = "method_" + classId + "_" + method.getName();
                nodesMap.computeIfAbsent(methodId, k -> {
                    GraphNode node = new GraphNode(methodId, method.getName(), GraphNode.NodeType.METHOD, method.getFilePath(), method.getStartLine(), method.getEndLine(), new ArrayList<>(), new ArrayList<>());
                    graph.addNode(node);
                    return node;
                });
            }
        }

        // Second pass: create links and populate adjacency lists
        for (JavaClass javaClass : javaClasses) {
            String classId = "class_" + javaClass.getName();
            GraphNode classNode = nodesMap.get(classId);

            for (JavaField field : javaClass.getFields()) {
                String fieldId = "field_" + classId + "_" + field.getName();
                GraphNode fieldNode = nodesMap.get(fieldId);
                GraphLink link = new GraphLink(classId, fieldId, GraphLink.LinkType.CONTAINS);
                classNode.getOutgoingLinks().add(link);
                fieldNode.getIncomingLinks().add(link);
                graph.addLink(link);
            }

            for (JavaMethod method : javaClass.getMethods()) {
                String methodId = "method_" + classId + "_" + method.getName();
                GraphNode methodNode = nodesMap.get(methodId);
                GraphLink containsLink = new GraphLink(classId, methodId, GraphLink.LinkType.CONTAINS);
                classNode.getOutgoingLinks().add(containsLink);
                methodNode.getIncomingLinks().add(containsLink);
                graph.addLink(containsLink);

                // Analyze method body for method calls
                Pattern methodCallPattern = Pattern.compile("\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(");
                Matcher matcher = methodCallPattern.matcher(method.getBody());
                while (matcher.find()) {
                    String calledMethodName = matcher.group(1);
                    // This is a simplistic approach. A more robust solution would involve symbol resolution.
                    // For now, we'll create a link if a method with that name exists anywhere in the tree.
                    for (JavaClass targetClass : javaClasses) {
                        for (JavaMethod targetMethod : targetClass.getMethods()) {
                            if (targetMethod.getName().equals(calledMethodName)) {
                                String targetClassId = "class_" + targetClass.getName();
                                String targetMethodId = "method_" + targetClassId + "_" + targetMethod.getName();
                                GraphNode targetMethodNode = nodesMap.get(targetMethodId);

                                if (targetMethodNode != null) { // Ensure target node exists
                                    GraphLink callsLink = new GraphLink(methodId, targetMethodId, GraphLink.LinkType.CALLS);
                                    methodNode.getOutgoingLinks().add(callsLink);
                                    targetMethodNode.getIncomingLinks().add(callsLink);
                                    graph.addLink(callsLink);
                                }
                            }
                        }
                    }
                }
            }
        }
        return graph;
    }
}
