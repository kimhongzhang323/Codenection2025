package com.example.AutoDocX.service;

import com.example.AutoDocX.parser.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class JavaGraphConverter {

    @Autowired
    private JavaTreeConverter javaTreeConverter;

    public Graph convertJavaTreeToGraph(List<JavaClass> javaClasses) {
        Graph graph = new Graph();
        Map<String, GraphNode> nodesMap = createNodes(graph, javaClasses);

        for (JavaClass javaClass : javaClasses) {
            String classId = generateNodeId(javaClass);
            GraphNode classNode = nodesMap.get(classId);

            createFieldLinks(graph, javaClass, classNode, nodesMap);
            createMethodLinks(graph, javaClass, classNode, nodesMap, javaClasses);
            addInheritanceLinks(graph, javaClass, classNode, nodesMap);
            addImplementsLinks(graph, javaClass, classNode, nodesMap);
            addCompositionLinks(graph, javaClass, classNode, nodesMap, javaClasses);
        }

        filterGraph(graph);
        return graph;
    }

    // ---------- Node Creation ----------
    private Map<String, GraphNode> createNodes(Graph graph, List<JavaClass> javaClasses) {
        Map<String, GraphNode> nodesMap = new HashMap<>();

        for (JavaClass javaClass : javaClasses) {
            // Class node
            String classId = generateNodeId(javaClass);
            String classLabel = "class_" + javaClass.getName();
            GraphNode classNode = new GraphNode(
                    classId,
                    classLabel,
                    GraphNode.NodeType.CLASS,
                    javaClass.getFilePath(),
                    javaClass.getStartLine(),
                    javaClass.getEndLine(),
                    null,
                    new ArrayList<>(),
                    new ArrayList<>()
            );
            graph.addNode(classNode);
            nodesMap.put(classId, classNode);

            // Field nodes
            for (JavaField field : javaClass.getFields()) {
                String fieldId = generateNodeId(javaClass, field);
                String fieldLabel = "field_" + classLabel + "_" + field.getName();
                GraphNode fieldNode = new GraphNode(
                        fieldId,
                        fieldLabel,
                        GraphNode.NodeType.FIELD,
                        field.getFilePath(),
                        field.getStartLine(),
                        field.getEndLine(),
                        field.getAccessModifier(),
                        new ArrayList<>(),
                        new ArrayList<>()
                );
                graph.addNode(fieldNode);
                nodesMap.put(fieldId, fieldNode);
            }

            // Method nodes
            for (JavaMethod method : javaClass.getMethods()) {
                String methodId = generateNodeId(javaClass, method);
                String methodLabel = "method_" + classLabel + "_" + method.getName();
                GraphNode methodNode = new GraphNode(
                        methodId,
                        methodLabel,
                        GraphNode.NodeType.METHOD,
                        method.getFilePath(),
                        method.getStartLine(),
                        method.getEndLine(),
                        null,
                        new ArrayList<>(),
                        new ArrayList<>()
                );
                graph.addNode(methodNode);
                nodesMap.put(methodId, methodNode);
            }
        }
        return nodesMap;
    }

    // ---------- Link Helpers ----------
    private void addLink(Graph graph, GraphNode source, GraphNode target, GraphLink.LinkType type) {
        if (source == null || target == null) {
            return; // prevent NPE if lookup failed
        }
        GraphLink link = new GraphLink(source.getId(), target.getId(), type);
        source.getOutgoingLinks().add(link);
        target.getIncomingLinks().add(link);
        graph.addLink(link);
    }

    private void createFieldLinks(Graph graph, JavaClass javaClass, GraphNode classNode, Map<String, GraphNode> nodesMap) {
        for (JavaField field : javaClass.getFields()) {
            GraphNode fieldNode = nodesMap.get(generateNodeId(javaClass, field));
            addLink(graph, classNode, fieldNode, GraphLink.LinkType.CONTAINS);
        }
    }

    private void createMethodLinks(Graph graph, JavaClass javaClass, GraphNode classNode,
                                   Map<String, GraphNode> nodesMap, List<JavaClass> allClasses) {
        for (JavaMethod method : javaClass.getMethods()) {
            GraphNode methodNode = nodesMap.get(generateNodeId(javaClass, method));
            addLink(graph, classNode, methodNode, GraphLink.LinkType.CONTAINS);

            // Method calls
            for (JavaClass targetClass : allClasses) {
                for (JavaMethod targetMethod : targetClass.getMethods()) {
                    if (method.getBody().contains(targetMethod.getName())) {
                        GraphNode targetNode = nodesMap.get(generateNodeId(targetClass, targetMethod));
                        addLink(graph, methodNode, targetNode, GraphLink.LinkType.CALLS);
                    }
                }
            }

            // Field access detection
            for (JavaField field : javaClass.getFields()) {
                GraphNode fieldNode = nodesMap.get(generateNodeId(javaClass, field));
                if (fieldNode != null) {
                    if (method.getBody().matches(".*\\b" + field.getName() + "\\b.*")) {
                        addLink(graph, methodNode, fieldNode, GraphLink.LinkType.READS);
                    }
                    if (method.getBody().matches(".*\\b" + field.getName() + "\\s*=.*")) {
                        addLink(graph, methodNode, fieldNode, GraphLink.LinkType.WRITES);
                    }
                }
            }
        }
    }

    private void addInheritanceLinks(Graph graph, JavaClass javaClass, GraphNode classNode, Map<String, GraphNode> nodesMap) {
        if (javaClass.getSuperClass() != null) {
            String superId = javaClass.getSuperClass(); // should already be canonical (package+name)
            GraphNode superClassNode = nodesMap.get(superId);
            addLink(graph, classNode, superClassNode, GraphLink.LinkType.INHERITS);
        }
    }

    private void addImplementsLinks(Graph graph, JavaClass javaClass, GraphNode classNode, Map<String, GraphNode> nodesMap) {
        for (String interfaceName : javaClass.getInterfaces()) {
            GraphNode interfaceNode = nodesMap.get(interfaceName);
            addLink(graph, classNode, interfaceNode, GraphLink.LinkType.IMPLEMENTS);
        }
    }

    private void addCompositionLinks(Graph graph, JavaClass javaClass, GraphNode classNode,
                                     Map<String, GraphNode> nodesMap, List<JavaClass> allClasses) {
        for (JavaField field : javaClass.getFields()) {
            for (JavaClass targetClass : allClasses) {
                if (targetClass.getName().equals(field.getType())) {
                    GraphNode targetClassNode = nodesMap.get(generateNodeId(targetClass));
                    addLink(graph, classNode, targetClassNode, GraphLink.LinkType.COMPOSES);
                }
            }
        }
    }

    // ---------- Filtering ----------
    private void filterGraph(Graph graph) {
        List<GraphNode> nodesToRemove = new ArrayList<>();
        List<GraphLink> linksToRemove = new ArrayList<>();

        for (GraphNode node : graph.getNodes()) {
            if (node.getType() == GraphNode.NodeType.FIELD && "private".equals(node.getAccessModifier())) {
                boolean hasWrites = node.getIncomingLinks().stream()
                        .anyMatch(link -> link.getType() == GraphLink.LinkType.WRITES);
                if (!hasWrites) {
                    nodesToRemove.add(node);
                    linksToRemove.addAll(node.getOutgoingLinks());
                    linksToRemove.addAll(node.getIncomingLinks());
                }
            }
        }

        graph.getNodes().removeAll(nodesToRemove);
        graph.getLinks().removeAll(linksToRemove);

        for (GraphLink link : linksToRemove) {
            graph.getNodeById(link.getSource())
                    .ifPresent(sourceNode -> sourceNode.getOutgoingLinks().remove(link));
            graph.getNodeById(link.getTarget())
                    .ifPresent(targetNode -> targetNode.getIncomingLinks().remove(link));
        }
    }

    // ---------- ID Generator ----------
    private String generateNodeId(JavaClass javaClass) {
        return javaClass.getPackageName() + "." + javaClass.getName();
    }

    private String generateNodeId(JavaClass javaClass, JavaField field) {
        return generateNodeId(javaClass) + "." + field.getName();
    }

    private String generateNodeId(JavaClass javaClass, JavaMethod method) {
        return generateNodeId(javaClass) + "." + method.getName();
    }
}
