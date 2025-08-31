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
                GraphNode node = new GraphNode(classId, javaClass.getName(), GraphNode.NodeType.CLASS, javaClass.getFilePath(), javaClass.getStartLine(), javaClass.getEndLine(), null, new ArrayList<>(), new ArrayList<>());
                graph.addNode(node);
                return node;
            });

            for (JavaField field : javaClass.getFields()) {
                String fieldId = "field_" + classId + "_" + field.getName();
                nodesMap.computeIfAbsent(fieldId, k -> {
                    GraphNode node = new GraphNode(fieldId, field.getName(), GraphNode.NodeType.FIELD, field.getFilePath(), field.getStartLine(), field.getEndLine(), field.getAccessModifier(), new ArrayList<>(), new ArrayList<>());
                    graph.addNode(node);
                    return node;
                });
            }

            for (JavaMethod method : javaClass.getMethods()) {
                String methodId = "method_" + classId + "_" + method.getName();
                nodesMap.computeIfAbsent(methodId, k -> {
                    GraphNode node = new GraphNode(methodId, method.getName(), GraphNode.NodeType.METHOD, method.getFilePath(), method.getStartLine(), method.getEndLine(), null, new ArrayList<>(), new ArrayList<>());
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

                // Analyze method body for field reads/writes
                for (JavaField field : javaClass.getFields()) {
                    String fieldName = field.getName();
                    String fieldId = "field_" + classId + "_" + fieldName;
                    GraphNode fieldNode = nodesMap.get(fieldId);

                    if (fieldNode != null) {
                        // Simple regex for reads (field name not followed by assignment operator)
                        Pattern readPattern = Pattern.compile("\\b" + fieldName + "\\b(?!\\s*=)");
                        Matcher readMatcher = readPattern.matcher(method.getBody());
                        if (readMatcher.find()) {
                            GraphLink readsLink = new GraphLink(methodId, fieldId, GraphLink.LinkType.READS);
                            methodNode.getOutgoingLinks().add(readsLink);
                            fieldNode.getIncomingLinks().add(readsLink);
                            graph.addLink(readsLink);
                        }

                        // Simple regex for writes (field name followed by assignment operator)
                        Pattern writePattern = Pattern.compile("\\b" + fieldName + "\\s*=");
                        Matcher writeMatcher = writePattern.matcher(method.getBody());
                        if (writeMatcher.find()) {
                            GraphLink writesLink = new GraphLink(methodId, fieldId, GraphLink.LinkType.WRITES);
                            methodNode.getOutgoingLinks().add(writesLink);
                            fieldNode.getIncomingLinks().add(writesLink);
                            graph.addLink(writesLink);
                        }
                    }
                }
            }

            // Add inheritance links
            if (javaClass.getSuperClass() != null) {
                String superClassId = "class_" + javaClass.getSuperClass();
                GraphNode superClassNode = nodesMap.get(superClassId);
                if (superClassNode != null) {
                    GraphLink inheritsLink = new GraphLink(classId, superClassId, GraphLink.LinkType.INHERITS);
                    classNode.getOutgoingLinks().add(inheritsLink);
                    superClassNode.getIncomingLinks().add(inheritsLink);
                    graph.addLink(inheritsLink);
                }
            }

            // Add implements links
            for (String interfaceName : javaClass.getInterfaces()) {
                String interfaceId = "class_" + interfaceName;
                GraphNode interfaceNode = nodesMap.get(interfaceId);
                if (interfaceNode != null) {
                    GraphLink implementsLink = new GraphLink(classId, interfaceId, GraphLink.LinkType.IMPLEMENTS);
                    classNode.getOutgoingLinks().add(implementsLink);
                    interfaceNode.getIncomingLinks().add(implementsLink);
                    graph.addLink(implementsLink);
                }
            }

            // Add composition links (has-a relationship)
            for (JavaField field : javaClass.getFields()) {
                String fieldType = field.getType();
                // Check if the field type corresponds to another class in our parsed Java classes
                // This is a simplistic check; a more robust solution would involve symbol resolution
                for (JavaClass targetClass : javaClasses) {
                    if (targetClass.getName().equals(fieldType)) {
                        String targetClassId = "class_" + targetClass.getName();
                        GraphNode targetClassNode = nodesMap.get(targetClassId);

                        if (targetClassNode != null) {
                            GraphLink exposesLink = new GraphLink(classId, targetClassId, GraphLink.LinkType.COMPOSES);
                            classNode.getOutgoingLinks().add(exposesLink);
                            targetClassNode.getIncomingLinks().add(exposesLink);
                            graph.addLink(exposesLink);
                        }
                    }
                }
            }
        }
        filterGraph(graph); // Call filter method before returning the graph
        return graph;
    }

    public Map<String, List<Map<String, Object>>> convertJavaTreeToGraphData(List<JavaClass> javaClasses) {
        Graph graph = convertJavaTreeToGraph(javaClasses);
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (GraphNode node : graph.getNodes()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", node.getId());
            map.put("label", node.getLabel());
            map.put("type", node.getType().toString());
            map.put("filePath", node.getFilePath());
            map.put("startLine", node.getStartLine());
            map.put("endLine", node.getEndLine());
            map.put("accessModifier", node.getAccessModifier());
            nodes.add(map);
        }
        List<Map<String, Object>> links = new ArrayList<>();
        for (GraphLink link : graph.getLinks()) {
            Map<String, Object> map = new HashMap<>();
            map.put("source", link.getSource());
            map.put("target", link.getTarget());
            map.put("type", link.getType().toString());
            links.add(map);
        }
        Map<String, List<Map<String, Object>>> result = new HashMap<>();
        result.put("nodes", nodes);
        result.put("links", links);
        return result;
    }

    private void filterGraph(Graph graph) {
        List<GraphNode> nodesToRemove = new ArrayList<>();
        List<GraphLink> linksToRemove = new ArrayList<>();

        for (GraphNode node : graph.getNodes()) {
            if (node.getType() == GraphNode.NodeType.FIELD && "private".equals(node.getAccessModifier())) {
                boolean hasWrites = false;
                for (GraphLink link : node.getIncomingLinks()) {
                    if (link.getType() == GraphLink.LinkType.WRITES) {
                        hasWrites = true;
                        break;
                    }
                }
                if (!hasWrites) {
                    nodesToRemove.add(node);
                }
            }
        }

        for (GraphNode node : nodesToRemove) {
            // Remove all links connected to the node being removed
            linksToRemove.addAll(node.getOutgoingLinks());
            linksToRemove.addAll(node.getIncomingLinks());

            // Remove the node itself
            graph.getNodes().remove(node);
        }

        for (GraphLink link : linksToRemove) {
            graph.getLinks().remove(link);
            // Also remove these links from the adjacency lists of connected nodes
            graph.getNodeById(link.getSource()).ifPresent(sourceNode -> sourceNode.getOutgoingLinks().remove(link));
            graph.getNodeById(link.getTarget()).ifPresent(targetNode -> targetNode.getIncomingLinks().remove(link));
        }
    }
}
