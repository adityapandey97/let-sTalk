package com.connectchat.service;

import com.connectchat.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    private final Path uploadRoot;

    private static final List<String> ALLOWED_CATEGORIES = Arrays.asList(
            "profile", "images", "videos", "documents", "voice", "stories"
    );

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "webp", "svg",
            "mp4", "webm", "mov", "avi",
            "mp3", "wav", "ogg", "m4a", "weba",
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "csv"
    );

    public FileService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        initDirectories();
    }

    private void initDirectories() {
        try {
            if (!Files.exists(uploadRoot)) {
                Files.createDirectories(uploadRoot);
            }
            for (String cat : ALLOWED_CATEGORIES) {
                Path catPath = uploadRoot.resolve(cat);
                if (!Files.exists(catPath)) {
                    Files.createDirectories(catPath);
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload directories: " + e.getMessage(), e);
        }
    }

    public String storeFile(MultipartFile file, String category) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty.");
        }

        String targetCategory = (category != null && ALLOWED_CATEGORIES.contains(category.toLowerCase()))
                ? category.toLowerCase()
                : "documents";

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");

        if (originalFilename.contains("..")) {
            throw new BadRequestException("Filename contains invalid path sequence: " + originalFilename);
        }

        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex + 1).toLowerCase();
        }

        if (!extension.isEmpty() && !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("File type not allowed: " + extension);
        }

        String storedName = UUID.randomUUID().toString() + (extension.isEmpty() ? "" : "." + extension);

        try {
            Path targetLocation = uploadRoot.resolve(targetCategory).resolve(storedName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + targetCategory + "/" + storedName;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    public boolean deleteFile(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/uploads/")) {
            return false;
        }
        try {
            String relative = fileUrl.substring("/uploads/".length());
            Path target = uploadRoot.resolve(relative).normalize();
            if (target.startsWith(uploadRoot) && Files.exists(target)) {
                Files.delete(target);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    public Path getUploadRoot() {
        return uploadRoot;
    }
}
