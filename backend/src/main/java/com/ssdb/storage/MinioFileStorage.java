package com.ssdb.storage;

import io.minio.*;
import io.minio.messages.Item;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Component
public class MinioFileStorage {

    private static final Logger log = LoggerFactory.getLogger(MinioFileStorage.class);

    @Value("${minio.endpoint}")
    private String endpoint;
    @Value("${minio.access-key}")
    private String accessKey;
    @Value("${minio.secret-key}")
    private String secretKey;
    @Value("${minio.bucket}")
    private String bucket;

    private MinioClient client;

    @PostConstruct
    public void init() {
        try {
            client = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
            boolean found = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!found) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("created minio bucket: {}", bucket);
            }
            log.info("minio connected to {} bucket={}", endpoint, bucket);
        } catch (Exception e) {
            log.error("minio init failed: {}", e.getMessage());
        }
    }

    public void upload(String objectKey, byte[] data) {
        try {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(data), data.length, -1)
                            .build()
            );
            log.debug("uploaded {} bytes to {}", data.length, objectKey);
        } catch (Exception e) {
            log.error("upload failed for {}: {}", objectKey, e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public byte[] download(String objectKey) {
        try (InputStream is = client.getObject(
                GetObjectArgs.builder().bucket(bucket).object(objectKey).build())) {
            return is.readAllBytes();
        } catch (Exception e) {
            log.error("download failed for {}: {}", objectKey, e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public void delete(String objectKey) {
        try {
            client.removeObject(
                    RemoveObjectArgs.builder().bucket(bucket).object(objectKey).build()
            );
            log.debug("deleted {}", objectKey);
        } catch (Exception e) {
            log.error("delete failed for {}: {}", objectKey, e.getMessage());
        }
    }
}
