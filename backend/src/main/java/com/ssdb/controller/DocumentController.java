package com.ssdb.controller;

import com.ssdb.dto.ApiResponseDto;
import com.ssdb.dto.DocMetaDto;
import com.ssdb.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/document")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponseDto<Map<String, Object>>> upload(
            @RequestParam("encryptedFile") MultipartFile encryptedFile,
            @RequestParam(value = "encryptedName", required = false) String encryptedName) throws IOException {
        byte[] content = encryptedFile.getBytes();
        Integer fileId = documentService.uploadEncryptedDocument(content, encryptedName);
        return ResponseEntity.ok(ApiResponseDto.ok("upload success", Map.of("fileId", fileId)));
    }

    @GetMapping("/download/{fileId}")
    public ResponseEntity<byte[]> download(@PathVariable Integer fileId) {
        byte[] content = documentService.downloadEncryptedDocument(fileId);
        if (content == null) {
            return ResponseEntity.notFound().build();
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", fileId + ".enc");
        return ResponseEntity.ok().headers(headers).body(content);
    }

    @GetMapping("/list")
    public ResponseEntity<ApiResponseDto<List<DocMetaDto>>> list() {
        return ResponseEntity.ok(ApiResponseDto.ok(documentService.listDocuments()));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<ApiResponseDto<Void>> delete(@PathVariable Integer fileId) {
        boolean success = documentService.deleteDocument(fileId);
        if (success) {
            return ResponseEntity.ok(ApiResponseDto.ok("delete success", null));
        }
        return ResponseEntity.badRequest().body(ApiResponseDto.fail("file not found"));
    }
}
