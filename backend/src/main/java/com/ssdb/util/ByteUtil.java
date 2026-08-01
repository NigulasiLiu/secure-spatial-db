package com.ssdb.util;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class ByteUtil {

    private static final Base64.Encoder B64_ENCODER = Base64.getEncoder().withoutPadding();
    private static final Base64.Decoder B64_DECODER = Base64.getDecoder();

    public static String bytesToBase64(byte[] bytes) {
        return B64_ENCODER.encodeToString(bytes);
    }

    public static byte[] base64ToBytes(String base64) {
        return B64_DECODER.decode(base64);
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

    public static String bigIntegerToBase64(BigInteger value) {
        return bytesToBase64(value.toByteArray());
    }

    public static BigInteger base64ToBigInteger(String base64) {
        return new BigInteger(1, base64ToBytes(base64));
    }

    public static byte[] xorBytes(byte[] a, byte[] b) {
        int len = Math.max(a.length, b.length);
        byte[] result = new byte[len];
        for (int i = 0; i < len; i++) {
            byte av = i < a.length ? a[i] : 0;
            byte bv = i < b.length ? b[i] : 0;
            result[i] = (byte) (av ^ bv);
        }
        return result;
    }
}
