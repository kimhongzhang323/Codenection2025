package com.example.AutoDocX.service;

import org.eclipse.jgit.api.CloneCommand;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.PullResult;
import org.eclipse.jgit.api.LogCommand;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.springframework.stereotype.Service;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import org.eclipse.jgit.revwalk.filter.CommitTimeRevFilter;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

@Service
public class GitService {

    /**
     * Clones a GitHub repository to the target directory.
     *
     * @param repoUrl   GitHub repo URL
     * @param targetDir Path where repo will be cloned
     * @return Path to cloned repository root
     * @throws GitAPIException if cloning fails
     */
    public String cloneRepo(String repoUrl, Path targetDir) throws GitAPIException {
        return cloneRepo(repoUrl, null, targetDir);
    }

    public String cloneRepo(String repoUrl, String branch, Path targetDir) throws GitAPIException {
        CloneCommand cloneCommand = Git.cloneRepository()
                .setURI(repoUrl)
                .setDirectory(targetDir.toFile());

        if (branch != null && !branch.isEmpty()) {
            cloneCommand.setBranch(branch);
        }

        try (Git git = cloneCommand.call()) {
            return git.getRepository().findRef("HEAD").getObjectId().getName();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public String pullRepo(Path repoPath) throws GitAPIException, IOException {
        try (Git git = Git.open(repoPath.toFile())) {
            PullResult result = git.pull().call();
            if (!result.isSuccessful()) {
                System.out.println("Pull Failed: " + repoPath + ". Pulling latest changes.");
            }
            return git.getRepository().findRef("HEAD").getObjectId().getName();
        }
    }

    public String getCommitDetails(Path repoPath, String commitHash) throws IOException, GitAPIException {
        try (Git git = Git.open(repoPath.toFile())) {
            Repository repository = git.getRepository();
            ObjectId commitId = repository.resolve(commitHash);
            if (commitId == null) {
                return "Commit not found: " + commitHash;
            }
            RevCommit commit = repository.parseCommit(commitId);
            return "Commit: " + commit.getName() + "\n" +
                   "Author: " + commit.getAuthorIdent().getName() + "\n" +
                   "Date: " + commit.getAuthorIdent().getWhen() + "\n" +
                   "Message: " + commit.getFullMessage();
        }
    }

    public String getCommitHistory(Path repoPath) throws IOException, GitAPIException {
        StringBuilder history = new StringBuilder();
        try (Git git = Git.open(repoPath.toFile())) {
            Iterable<RevCommit> logs = git.log().all().call();
            for (RevCommit rev : logs) {
                history.append("Commit: ").append(rev.getName()).append("\n");
                history.append("Author: ").append(rev.getAuthorIdent().getName()).append("\n");
                history.append("Date: ").append(rev.getAuthorIdent().getWhen()).append("\n");
                history.append("Message: ").append(rev.getShortMessage()).append("\n\n");
            }
        }
        return history.toString();
    }

    public List<String> getModifiedFilesInCommit(Path repoPath, String commitHash) throws IOException, GitAPIException {
        try (Git git = Git.open(repoPath.toFile())) {
            Repository repository = git.getRepository();
            ObjectId commitId = repository.resolve(commitHash);
            if (commitId == null) {
                throw new IOException("Commit not found: " + commitHash);
            }
            RevCommit commit = repository.parseCommit(commitId);
            RevCommit parent = commit.getParentCount() > 0 ? repository.parseCommit(commit.getParent(0).getId()) : null;

            DiffFormatter diffFormatter = new DiffFormatter(DisabledOutputStream.INSTANCE);
            diffFormatter.setRepository(repository);
            diffFormatter.setContext(0);

            List<DiffEntry> diffs;
            if (parent == null) {
                // This is the initial commit, compare against an empty tree
                diffs = diffFormatter.scan(null, new CanonicalTreeParser(null, repository.newObjectReader(), commit.getTree()));
            } else {
                diffs = diffFormatter.scan(parent.getTree(), commit.getTree());
            }

            return diffs.stream()
                    .map(diff -> diff.getChangeType() + ": " + (diff.getChangeType() == DiffEntry.ChangeType.DELETE ? diff.getOldPath() : diff.getNewPath()))
                    .collect(Collectors.toList());
        }
    }

    /**
     * Finds the first regular file in the repository (sorted alphabetically).
     */
    public Optional<Path> findFirstFile(Path rootDir) throws IOException {
        try (Stream<Path> stream = Files.walk(rootDir)) {
            return stream
                    .filter(Files::isRegularFile)
                    .sorted()
                    .findFirst();
        }
    }

    /**
     * Reads the content of a file.
     */
    public String readFileContent(Path filePath) throws IOException {
        return Files.readString(filePath);
    }

    /**
     * Reads a specific range of lines from a file.
     */
    public String readFileContent(String absolutePath, int startLine, int endLine) throws IOException {
        StringBuilder content = new StringBuilder();
        Path path = Paths.get(absolutePath);
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            throw new FileNotFoundException("File not found or is not a regular file: " + absolutePath);
        }

        try (Stream<String> lines = Files.lines(path)) {
            List<String> allLines = lines.collect(Collectors.toList());
            for (int i = startLine - 1; i < endLine && i < allLines.size(); i++) {
                content.append(allLines.get(i)).append("\n");
            }
        }
        return content.toString();
    }

    public List<RevCommit> getCommitsSince(Path repoPath, Date sinceDate) throws GitAPIException, IOException {
        List<RevCommit> commits = new ArrayList<>();
        try (Git git = Git.open(repoPath.toFile())) {
            LogCommand log = git.log().setRevFilter(CommitTimeRevFilter.after(sinceDate));
            Iterable<RevCommit> logs = log.call();
            logs.forEach(commits::add);
        }
        // The log is typically newest-to-oldest, let's reverse it to be chronological
        Collections.reverse(commits);
        return commits;
    }

    public Date getFileLastModified(Path repoPath, String filePath) throws GitAPIException, IOException {
        try (Git git = Git.open(repoPath.toFile())) {
            LogCommand log = git.log().addPath(filePath).setMaxCount(1);
            Iterable<RevCommit> logs = log.call();
            for (RevCommit rev : logs) {
                return rev.getAuthorIdent().getWhen();
            }
        }
        return null; // Or throw an exception if no commit found
    }
}
