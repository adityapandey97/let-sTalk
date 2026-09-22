package com.example.connectchat.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Controller handling file, video, image, and voice note uploads.
 * Files are stored locally in the configured upload directory (default: ./uploads)
 * and served through the WebMvc resource handler at /uploads/**.
 */
@RestController
@RequestMapping({"/api/media", "/api/files"})
public class MediaUploadController {

    private final Path uploadDirectory;

    public MediaUploadController(@Value("${app.upload.dir:./uploads}") String uploadDir) {
        this.uploadDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload directory: " + uploadDir, e);
        }
    }

    /**
     * Upload a single file (image, video, document, audio)
     *
     * @param file the uploaded MultipartFile
     * @return JSON containing the public access URL, original filename, file size, and content type
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Cannot upload empty file");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        String rawOriginalName = file.getOriginalFilename();
        String safeName = (rawOriginalName != null && !rawOriginalName.isBlank())
                ? rawOriginalName.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "file_" + System.currentTimeMillis();

        String uniqueFileName = UUID.randomUUID().toString() + "_" + safeName;
        Path targetPath = this.uploadDirectory.resolve(uniqueFileName).normalize();

        // Prevent path traversal outside upload dir
        if (!targetPath.startsWith(this.uploadDirectory)) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Invalid file name");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            Map<String, Object> response = new HashMap<>();
            response.put("url", "/uploads/" + uniqueFileName);
            response.put("fileName", rawOriginalName != null ? rawOriginalName : uniqueFileName);
            response.put("fileSize", file.getSize());
            response.put("contentType", file.getContentType() != null ? file.getContentType() : "application/octet-stream");
            response.put("success", true);

            return ResponseEntity.ok(response);
        } catch (IOException ex) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to store file: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
