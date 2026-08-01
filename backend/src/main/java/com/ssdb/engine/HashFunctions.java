package com.ssdb.engine;

import org.bouncycastle.crypto.digests.Blake2bDigest;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

@Component
public class HashFunctions {

    public static final int LAMBDA = 128;
    public static final int HASH_OUTPUT_LENGTH = 16;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final SecureRandom secureRandom = new SecureRandom();
    private final byte[] intBuffer = new byte[4];

    public byte[] prf(byte[] key, String keyword) {
        try {
            Mac hmac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(key, HMAC_ALGORITHM);
            hmac.init(keySpec);
            return hmac.doFinal(keyword.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public byte[] hashBytes(byte[] input1, byte[] input2) {
        Blake2bDigest digest = new Blake2bDigest(HASH_OUTPUT_LENGTH * 8);
        digest.update(input1, 0, input1.length);
        digest.update(input2, 0, input2.length);
        byte[] result = new byte[HASH_OUTPUT_LENGTH];
        digest.doFinal(result, 0);
        return result;
    }

    public byte[] hashInt(byte[] input1, int input2) {
        Blake2bDigest digest = new Blake2bDigest(HASH_OUTPUT_LENGTH * 8);
        digest.update(input1, 0, input1.length);
        intBuffer[0] = (byte) (input2 >> 24);
        intBuffer[1] = (byte) (input2 >> 16);
        intBuffer[2] = (byte) (input2 >> 8);
        intBuffer[3] = (byte) input2;
        digest.update(intBuffer, 0, intBuffer.length);
        byte[] result = new byte[HASH_OUTPUT_LENGTH];
        digest.doFinal(result, 0);
        return result;
    }

    public byte[] generateRandomRc() {
        byte[] randomBytes = new byte[LAMBDA / 8];
        secureRandom.nextBytes(randomBytes);
        return randomBytes;
    }

    public byte[] xorBytes(byte[] a, byte[] b) {
        int len = Math.max(a.length, b.length);
        byte[] result = new byte[len];
        for (int i = 0; i < len; i++) {
            byte av = i < a.length ? a[i] : 0;
            byte bv = i < b.length ? b[i] : 0;
            result[i] = (byte) (av ^ bv);
        }
        return result;
    }

    public static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b & 0xff));
        }
        return sb.toString();
    }

    public static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                    + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}
