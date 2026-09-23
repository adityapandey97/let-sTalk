package com.connectchat.controller;

import com.connectchat.dto.common.ApiResponse;
import com.connectchat.service.FileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file,
                                                          @RequestParam(value = "category", required = false, defaultValue = "documents") String category) {
        String fileUrl = fileService.storeFile(file, category);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("fileUrl", fileUrl);
        response.put("fileName", file.getOriginalFilename());
        response.put("fileSize", file.getSize());
        response.put("contentType", file.getContentType());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse> deleteFile(@RequestParam("fileUrl") String fileUrl) {
        boolean deleted = fileService.deleteFile(fileUrl);
        if (deleted) {
            return ResponseEntity.ok(new ApiResponse(true, "File deleted successfully"));
        } else {
            return ResponseEntity.ok(new ApiResponse(false, "File could not be deleted"));
        }
    }
}
