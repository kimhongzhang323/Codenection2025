package com.example.AutoDocX.service;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.nodeTypes.NodeWithName;
import com.github.javaparser.ast.nodeTypes.NodeWithSimpleName;
import com.github.javaparser.ast.stmt.BlockStmt;
import com.github.javaparser.symbolsolver.JavaSymbolSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import com.github.javaparser.ParserConfiguration.LanguageLevel;
import com.github.javaparser.ParserConfiguration;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.example.AutoDocX.parser.model.JavaClass;
import com.example.AutoDocX.parser.model.JavaMethod;
import com.example.AutoDocX.parser.model.JavaParameter;
import com.example.AutoDocX.parser.model.JavaField;

@Service
public class JavaTreeConverter {

    private static final Logger logger = LoggerFactory.getLogger(JavaTreeConverter.class);

    public List<JavaClass> convertRepoToJavaTree(Path repositoryPath) throws IOException {
        List<JavaClass> javaClasses = new ArrayList<>();
        CombinedTypeSolver combinedTypeSolver = new CombinedTypeSolver();
        combinedTypeSolver.add(new ReflectionTypeSolver());
        combinedTypeSolver.add(new JavaParserTypeSolver(repositoryPath.toFile()));

        JavaSymbolSolver symbolSolver = new JavaSymbolSolver(combinedTypeSolver);
        ParserConfiguration parserConfiguration = new ParserConfiguration();
        parserConfiguration.setSymbolResolver(symbolSolver);
        parserConfiguration.setLanguageLevel(LanguageLevel.JAVA_17);
        StaticJavaParser.setConfiguration(parserConfiguration);

        try (Stream<Path> paths = Files.walk(repositoryPath)) {
            paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .forEach(javaFilePath -> {
                        try {
                            logger.info("Parsing file: {}", javaFilePath);
                            CompilationUnit cu = StaticJavaParser.parse(javaFilePath);
                            javaClasses.addAll(parseCompilationUnit(cu, javaFilePath.toString()));
                        } catch (FileNotFoundException e) {
                            logger.error("File not found during parsing: {}", javaFilePath, e);
                        } catch (Exception e) {
                            logger.error("Error parsing file {}: {}", javaFilePath, e.getMessage(), e);
                        }
                    });
        }
        return javaClasses;
    }

    private List<JavaClass> parseCompilationUnit(CompilationUnit cu, String filePath) {
        List<JavaClass> classesInUnit = new ArrayList<>();

        cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDeclaration -> {
            String packageName = cu.getPackageDeclaration().map(NodeWithName::getNameAsString).orElse("default");
            String className = classDeclaration.getNameAsString();

            int startLine = classDeclaration.getBegin().map(pos -> pos.line).orElse(-1);
            int endLine = classDeclaration.getEnd().map(pos -> pos.line).orElse(-1);

            List<JavaMethod> methods = classDeclaration.getMethods().stream()
                    .map(methodDeclaration -> parseMethodDeclaration(className, methodDeclaration, filePath))
                    .collect(Collectors.toList());

            List<JavaField> fields = classDeclaration.getFields().stream()
                    .map(fieldDeclaration -> parseFieldDeclaration(className, fieldDeclaration, filePath))
                    .collect(Collectors.toList());

            List<String> imports = cu.getImports().stream()
                    .map(NodeWithName::getNameAsString)
                    .collect(Collectors.toList());

            String superClass = classDeclaration.getExtendedTypes().isEmpty() ? null : classDeclaration.getExtendedTypes().get(0).getNameAsString();
            List<String> interfaces = classDeclaration.getImplementedTypes().stream()
                    .map(NodeWithSimpleName::getNameAsString)
                    .collect(Collectors.toList());

            classesInUnit.add(new JavaClass(className, packageName, methods, fields, superClass, interfaces, imports, startLine, endLine, filePath));
        });
        return classesInUnit;
    }

    private JavaMethod parseMethodDeclaration(String fqClassName, MethodDeclaration methodDeclaration, String filePath) {
        String methodName = methodDeclaration.getNameAsString();
        String returnType = methodDeclaration.getTypeAsString();

        String signature = methodName + "(" +
                methodDeclaration.getParameters().stream()
                        .map(p -> p.getType().toString())
                        .collect(Collectors.joining(",")) +
                ")";

        int startLine = methodDeclaration.getBegin().map(pos -> pos.line).orElse(-1);
        int endLine = methodDeclaration.getEnd().map(pos -> pos.line).orElse(-1);

        List<JavaParameter> parameters = methodDeclaration.getParameters().stream()
                .map(this::parseParameter)
                .collect(Collectors.toList());
        List<String> thrownExceptions = methodDeclaration.getThrownExceptions().stream()
                .map(n -> n.getElementType().asString())
                .collect(Collectors.toList());
        String body = methodDeclaration.getBody().map(BlockStmt::toString).orElse("");

        return new JavaMethod(signature, returnType, parameters, thrownExceptions, body, startLine, endLine, filePath);
    }

    private JavaParameter parseParameter(Parameter parameter) {
        return new JavaParameter(parameter.getNameAsString(), parameter.getTypeAsString());
    }

    private JavaField parseFieldDeclaration(String fqClassName, FieldDeclaration fieldDeclaration, String filePath) {
        String fieldName = fieldDeclaration.getVariables().get(0).getNameAsString();
        String fieldType = fieldDeclaration.getElementType().toString();
        String accessModifier = fieldDeclaration.getAccessSpecifier().toString();

        String fqFieldName = fqClassName + "." + fieldName;

        int startLine = fieldDeclaration.getBegin().map(pos -> pos.line).orElse(-1);
        int endLine = fieldDeclaration.getEnd().map(pos -> pos.line).orElse(-1);

        return new JavaField(fqFieldName, fieldType, accessModifier, startLine, endLine, filePath);
    }
}
