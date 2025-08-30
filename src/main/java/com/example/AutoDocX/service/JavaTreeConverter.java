package com.example.AutoDocX.service;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.stmt.BlockStmt;
import com.github.javaparser.symbolsolver.JavaSymbolSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
        StaticJavaParser.getParserConfiguration().setSymbolResolver(symbolSolver);

        try (Stream<Path> paths = Files.walk(repositoryPath)) {
            paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .forEach(javaFilePath -> {
                        try {
                            logger.info("Parsing file: {}", javaFilePath);
                            CompilationUnit cu = StaticJavaParser.parse(javaFilePath);
                            javaClasses.addAll(parseCompilationUnit(cu));
                        } catch (FileNotFoundException e) {
                            logger.error("File not found during parsing: {}", javaFilePath, e);
                        } catch (Exception e) {
                            logger.error("Error parsing file {}: {}", javaFilePath, e.getMessage(), e);
                        }
                    });
        }
        return javaClasses;
    }

    private List<JavaClass> parseCompilationUnit(CompilationUnit cu) {
        List<JavaClass> classesInUnit = new ArrayList<>();

        cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDeclaration -> {
            String className = classDeclaration.getNameAsString();
            String packageName = cu.getPackageDeclaration().map(pd -> pd.getNameAsString()).orElse("default");

            List<JavaMethod> methods = classDeclaration.getMethods().stream()
                    .map(this::parseMethodDeclaration)
                    .collect(Collectors.toList());

            List<JavaField> fields = classDeclaration.getFields().stream()
                    .map(this::parseFieldDeclaration)
                    .collect(Collectors.toList());

            List<String> imports = cu.getImports().stream()
                    .map(i -> i.getNameAsString())
                    .collect(Collectors.toList());

            classesInUnit.add(new JavaClass(className, packageName, methods, fields, imports));
        });
        return classesInUnit;
    }

    private JavaMethod parseMethodDeclaration(MethodDeclaration methodDeclaration) {
        String methodName = methodDeclaration.getNameAsString();
        String returnType = methodDeclaration.getTypeAsString();
        List<JavaParameter> parameters = methodDeclaration.getParameters().stream()
                .map(this::parseParameter)
                .collect(Collectors.toList());
        List<String> thrownExceptions = methodDeclaration.getThrownExceptions().stream()
                .map(n -> n.getElementType().asString())
                .collect(Collectors.toList());
        String body = methodDeclaration.getBody().map(BlockStmt::toString).orElse("");

        return new JavaMethod(methodName, returnType, parameters, thrownExceptions, body);
    }

    private JavaParameter parseParameter(Parameter parameter) {
        return new JavaParameter(parameter.getNameAsString(), parameter.getTypeAsString());
    }

    private JavaField parseFieldDeclaration(FieldDeclaration fieldDeclaration) {
        String fieldName = fieldDeclaration.getVariables().get(0).getNameAsString(); // Assuming one variable per declaration
        String fieldType = fieldDeclaration.getElementType().toString();
        String accessModifier = fieldDeclaration.getAccessSpecifier().toString();

        return new JavaField(fieldName, fieldType, accessModifier);
    }
}
