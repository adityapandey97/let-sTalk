package com.connectchat.dto.message;

import com.connectchat.entity.Attachment;

public class AttachmentDto {
    private Long id;
    private String originalName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private String fileUrl;

    public AttachmentDto() {}

    public AttachmentDto(Attachment att) {
        if (att != null) {
            this.id = att.getId();
            this.originalName = att.getOriginalName();
            this.filePath = att.getFilePath();
            this.fileType = att.getFileType();
            this.fileSize = att.getFileSize();
            this.fileUrl = att.getFilePath();
        }
    }

    public AttachmentDto(String originalName, String filePath, String fileType, Long fileSize) {
        this.originalName = originalName;
        this.filePath = filePath;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.fileUrl = filePath;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
}
