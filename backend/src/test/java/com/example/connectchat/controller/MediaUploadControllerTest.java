package com.example.connectchat.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MediaUploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testUploadDocumentSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.pdf",
                "application/pdf",
                "Sample PDF content for test".getBytes()
        );

        mockMvc.perform(multipart("/api/media/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fileName").value("notes.pdf"))
                .andExpect(jsonPath("$.url").exists())
                .andExpect(jsonPath("$.contentType").value("application/pdf"));
    }

    @Test
    void testUploadVideoSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "Dummy video binary stream".getBytes()
        );

        mockMvc.perform(multipart("/api/media/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fileName").value("clip.mp4"))
                .andExpect(jsonPath("$.url").exists());
    }

    @Test
    void testUploadEmptyFileFails() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.txt",
                "text/plain",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/media/upload").file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
