package com.ssdb.engine;

import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

@Component
public class HilbertUtil {

    private int order = 12;
    private int dimension = 2;

    public HilbertUtil() {}

    public void configure(int order, int dimension) {
        this.order = order;
        this.dimension = dimension;
    }

    public BigInteger hilbertIndex(long[] point) {
        long x = point[0];
        long y = point[1];
        int n = 1 << order;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x >= n) x = n - 1;
        if (y >= n) y = n - 1;
        return encode((int) x, (int) y, order);
    }

    private BigInteger encode(int x, int y, int order) {
        long index = 0;
        int rx, ry;
        int s = 1 << (order - 1);
        while (s > 0) {
            rx = (x & s) > 0 ? 1 : 0;
            ry = (y & s) > 0 ? 1 : 0;
            index += (long) s * s * ((3 * rx) ^ ry);
            if (ry == 0) {
                if (rx == 1) {
                    x = s - 1 - x;
                    y = s - 1 - y;
                }
                int tmp = x;
                x = y;
                y = tmp;
            }
            s >>= 1;
        }
        return BigInteger.valueOf(index);
    }

    public List<String> preCode(long[] point) {
        BigInteger index = hilbertIndex(point);
        int requiredLength = 2 * order;
        String binaryString = String.format("%" + requiredLength + "s", index.toString(2)).replace(' ', '0');
        List<String> prefixList = new ArrayList<>(requiredLength + 1);
        prefixList.add(binaryString);
        StringBuilder builder = new StringBuilder(binaryString);
        for (int i = binaryString.length() - 1; i >= 0; i--) {
            builder.setCharAt(i, '*');
            prefixList.add(builder.toString());
        }
        return prefixList;
    }

    public List<String> preCover(BigInteger min, BigInteger max) {
        List<BigInteger> range = new ArrayList<>();
        BigInteger current = min;
        while (current.compareTo(max) <= 0) {
            range.add(current);
            current = current.add(BigInteger.ONE);
        }
        return generateBPC(range);
    }

    private List<String> generateBPC(List<BigInteger> values) {
        int bitLength = 2 * order;
        List<String> prefixes = new ArrayList<>();
        if (values.isEmpty()) return prefixes;
        BigInteger minVal = values.get(0);
        BigInteger maxVal = values.get(values.size() - 1);
        String minBin = padLeft(minVal.toString(2), bitLength);
        String maxBin = padLeft(maxVal.toString(2), bitLength);
        if (minBin.equals(maxBin)) {
            prefixes.add(minBin);
            return prefixes;
        }
        findPrefixCover(minBin, maxBin, bitLength, prefixes);
        return prefixes;
    }

    private void findPrefixCover(String minBin, String maxBin, int bitLength, List<String> prefixes) {
        if (minBin.equals(maxBin)) {
            prefixes.add(minBin);
            return;
        }
        int diffPos = 0;
        for (int i = 0; i < bitLength; i++) {
            if (minBin.charAt(i) != maxBin.charAt(i)) {
                diffPos = i;
                break;
            }
        }
        String commonPrefix = minBin.substring(0, diffPos);
        BigInteger minVal = new BigInteger(minBin, 2);
        BigInteger maxVal = new BigInteger(maxBin, 2);
        BigInteger rangeSize = BigInteger.ONE.shiftLeft(bitLength - diffPos);
        BigInteger rangeStart = new BigInteger(commonPrefix + "0".repeat(bitLength - diffPos), 2);
        BigInteger rangeEnd = rangeStart.add(rangeSize).subtract(BigInteger.ONE);
        if (minVal.equals(rangeStart) && maxVal.equals(rangeEnd)) {
            prefixes.add(commonPrefix + "*".repeat(bitLength - diffPos));
            return;
        }
        BigInteger mid = rangeStart.add(rangeSize.divide(BigInteger.TWO)).subtract(BigInteger.ONE);
        if (minVal.compareTo(mid) <= 0) {
            findPrefixCover(minBin, padLeft(mid.toString(2), bitLength), bitLength, prefixes);
        }
        BigInteger midNext = mid.add(BigInteger.ONE);
        if (maxVal.compareTo(midNext) >= 0) {
            findPrefixCover(padLeft(midNext.toString(2), bitLength), maxBin, bitLength, prefixes);
        }
    }

    private String padLeft(String s, int length) {
        if (s.length() >= length) return s;
        StringBuilder sb = new StringBuilder();
        for (int i = s.length(); i < length; i++) sb.append('0');
        sb.append(s);
        return sb.toString();
    }

    public int getOrder() { return order; }
    public int getDimension() { return dimension; }
}
