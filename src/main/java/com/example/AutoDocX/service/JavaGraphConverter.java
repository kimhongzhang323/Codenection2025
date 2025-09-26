package com.example.AutoDocX.service;

import com.example.AutoDocX.parser.model.*;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.ObjectCreationExpr;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.eclipse.jgit.api.errors.GitAPIException;
import java.io.IOException;
import java.nio.file.Path;

import java.util.*;

@Service
public class JavaGraphConverter {

    @Autowired
    private JavaTreeConverter javaTreeConverter;

    private static final int CLASS_SIZE_THRESHOLD = 50; // configurable LOC threshold

    public Graph convertJavaTreeToGraph(List<JavaClass> javaClasses, GitService gitService, Path repoPath) {
        Graph graph = new Graph();
        Map<String, GraphNode> nodesMap = createNodes(graph, javaClasses, gitService, repoPath);

        for (JavaClass javaClass : javaClasses) {
            String classId = generateNodeId(javaClass);
            GraphNode classNode = nodesMap.get(classId);

            createMethodLinks(graph, javaClass, classNode, nodesMap, javaClasses);
            addInheritanceLinks(graph, javaClass, classNode, nodesMap);
            addImplementsLinks(graph, javaClass, classNode, nodesMap);
            addCompositionLinks(graph, javaClass, classNode, nodesMap, javaClasses);
        }

        return graph;
    }

    // ---------- Node Creation ----------
    private Map<String, GraphNode> createNodes(Graph graph, List<JavaClass> javaClasses, GitService gitService, Path repoPath) {
        Map<String, GraphNode> nodesMap = new HashMap<>();

        for (JavaClass javaClass : javaClasses) {
            boolean isSmall = (javaClass.getEndLine() - javaClass.getStartLine()) <= CLASS_SIZE_THRESHOLD;

            Date lastModified = null;
            try {
                lastModified = gitService.getFileLastModified(repoPath, javaClass.getFilePath());
            } catch (GitAPIException | IOException e) {
                System.err.println("Could not retrieve last modified date for " + javaClass.getFilePath());
            }


            if (isSmall) {
                // One node for the entire class (with all methods + fields)
                String classId = generateNodeId(javaClass);
                GraphNode classNode = new GraphNode(
                        classId,
                        classId,// "class_" + javaClass.getName(),
                        GraphNode.NodeType.CLASS,
                        javaClass.getFilePath(),
                        javaClass.getStartLine(),
                        javaClass.getEndLine(),
                        extractFullClassCode(javaClass),
                        new ArrayList<>(),
                        new ArrayList<>(),
                        lastModified
                );
                graph.addNode(classNode);
                nodesMap.put(classId, classNode);
            } else {
                // Large class → split by methods, but keep constructors in the class node
                String classId = generateNodeId(javaClass);
                GraphNode classNode = new GraphNode(
                        classId,
                        classId,//"class_" + javaClass.getName(),
                        GraphNode.NodeType.CLASS,
                        javaClass.getFilePath(),
                        javaClass.getStartLine(),
                        javaClass.getEndLine(),
                        extractClassWithoutMethods(javaClass),
                        new ArrayList<>(),
                        new ArrayList<>(),
                        lastModified
                );
                graph.addNode(classNode);
                nodesMap.put(classId, classNode);

                for (JavaMethod method : javaClass.getMethods()) {
                    if (method.getName().equals(javaClass.getName())) {
                        // constructor → stays inside class node
                        continue;
                    }
                    String methodId = generateNodeId(javaClass, method);
                    GraphNode methodNode = new GraphNode(
                            methodId,
                            methodId,//"method_" + javaClass.getName() + "." + method.getName(),
                            GraphNode.NodeType.METHOD,
                            method.getFilePath(),
                            method.getStartLine(),
                            method.getEndLine(),
                            method.getBody(),
                            new ArrayList<>(),
                            new ArrayList<>(),
                            lastModified
                    );
                    graph.addNode(methodNode);
                    nodesMap.put(methodId, methodNode);
                }
            }
        }
        return nodesMap;
    }

    // ---------- Link Helpers ----------
    private void addLink(Graph graph, GraphNode source, GraphNode target, GraphLink.LinkType type) {
        if (source == null || target == null) return;
        GraphLink link = new GraphLink(source.getId(), target.getId(), type);
        source.getOutgoingLinks().add(link);
        target.getIncomingLinks().add(link);
        graph.addLink(link);
    }

    private void createMethodLinks(Graph graph, JavaClass javaClass, GraphNode classNode,
                                   Map<String, GraphNode> nodesMap, List<JavaClass> allClasses) {
        for (JavaMethod method : javaClass.getMethods()) {
            String methodId = generateNodeId(javaClass, method);
            GraphNode methodNode = nodesMap.get(methodId);
            GraphNode sourceNode = (methodNode != null) ? methodNode : classNode;

            if (method.getBody() == null || method.getBody().isBlank()) {
                continue;
            }

            // Parse method body with JavaParser
            try {
                var body = StaticJavaParser.parseBlock(method.getBody());

                // ---------- Normal method calls ----------
                body.findAll(MethodCallExpr.class).forEach(call -> {
                    String calledName = call.getNameAsString();
                    for (JavaClass targetClass : allClasses) {
                        for (JavaMethod targetMethod : targetClass.getMethods()) {
                            if (targetMethod.getName().equals(calledName)) {
                                GraphNode targetNode = nodesMap.get(generateNodeId(targetClass, targetMethod));
                                if (targetNode == null) {
                                    targetNode = nodesMap.get(generateNodeId(targetClass));
                                }
                                if (targetNode != null && !sourceNode.getId().equals(targetNode.getId())) {
                                    addLink(graph, sourceNode, targetNode, GraphLink.LinkType.CALLS);
                                }
                            }
                        }
                    }
                });

                // ---------- Constructor calls ----------
                body.findAll(ObjectCreationExpr.class).forEach(newObj -> {
                    String typeName = newObj.getType().getNameAsString();
                    for (JavaClass targetClass : allClasses) {
                        if (targetClass.getName().equals(typeName)) {
                            GraphNode targetNode = nodesMap.get(generateNodeId(targetClass));
                            if (targetNode != null && !sourceNode.getId().equals(targetNode.getId())) {
                                addLink(graph, sourceNode, targetNode, GraphLink.LinkType.CONSTRUCTS);
                            }
                        }
                    }
                });

            } catch (Exception e) {
                // fallback if parsing fails
                System.err.println("Failed to parse method body for: " + method.getName() + " in class " + javaClass.getName());
            }
        }
    }


    private void addInheritanceLinks(Graph graph, JavaClass javaClass, GraphNode classNode, Map<String, GraphNode> nodesMap) {
        if (javaClass.getSuperClass() != null) {
            GraphNode superClassNode = nodesMap.get(javaClass.getSuperClass());
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

    // ---------- Helpers ----------
    private String extractFullClassCode(JavaClass javaClass) {
        // TODO: build full class code if needed; placeholder now
        return "class " + javaClass.getName() + " { ... }";
    }

    private String extractClassWithoutMethods(JavaClass javaClass) {
        // TODO: build class skeleton without methods; placeholder now
        return "class " + javaClass.getName() + " { ... }";
    }

    // ---------- ID Generator ----------
    private String generateNodeId(JavaClass javaClass) {
        return javaClass.getPackageName() + "." + javaClass.getName();
    }

    private String generateNodeId(JavaClass javaClass, JavaMethod method) {
        return generateNodeId(javaClass) + "." + method.getName();
    }
}
