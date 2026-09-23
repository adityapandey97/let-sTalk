package com.connectchat;

import com.connectchat.exception.BadRequestException;
import com.connectchat.service.FileService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

@SpringBootTest
class FileValidationTest {

    @Autowired
    private FileService fileService;

    @Test
    void testValidFileUpload() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.png",
                "image/png",
                "test image content".getBytes()
        );

        String fileUrl = fileService.storeFile(file, "images");
        Assertions.assertNotNull(fileUrl);
        Assertions.assertTrue(fileUrl.startsWith("/uploads/images/"));

        // Clean up
        fileService.deleteFile(fileUrl);
    }

    @Test
    void testPathTraversalRejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "../../etc/passwd.jpg",
                "image/jpeg",
                "fake content".getBytes()
        );

        Assertions.assertThrows(BadRequestException.class, () ->
                fileService.storeFile(file, "images"));
    }

    @Test
    void testInvalidExtensionRejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "exploit.exe",
                "application/octet-stream",
                "malicious binary".getBytes()
        );

        Assertions.assertThrows(BadRequestException.class, () ->
                fileService.storeFile(file, "documents"));
    }
}
