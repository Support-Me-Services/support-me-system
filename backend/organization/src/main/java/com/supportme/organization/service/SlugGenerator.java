package com.supportme.organization.service;

import java.text.Normalizer;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * Turns free text into a URL-safe slug and, given a "is this slug already taken" predicate,
 * finds the first free candidate by appending -2, -3, ... Not thread-safe across the
 * check-then-generate window by itself - callers must also rely on a DB unique constraint and
 * retry on conflict for correctness under concurrency (see OrganizationService).
 */
final class SlugGenerator {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");
    private static final Pattern EDGE_HYPHENS = Pattern.compile("^-+|-+$");

    private SlugGenerator() {
    }

    static String slugify(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Cannot slugify blank input");
        }
        String normalized = Normalizer.normalize(input.trim(), Normalizer.Form.NFD);
        normalized = DIACRITICS.matcher(normalized).replaceAll("");
        // Polish-specific letters that Normalizer/NFD doesn't decompose (l-with-stroke has no
        // combining-diacritic decomposition to strip above).
        normalized = normalized.replace('ł', 'l').replace('Ł', 'L');
        normalized = normalized.toLowerCase();
        normalized = NON_ALPHANUMERIC.matcher(normalized).replaceAll("-");
        normalized = EDGE_HYPHENS.matcher(normalized).replaceAll("");
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Input slugifies to an empty string: " + input);
        }
        return normalized;
    }

    static String firstAvailable(String baseSlug, Predicate<String> isTaken) {
        if (!isTaken.test(baseSlug)) {
            return baseSlug;
        }
        for (int suffix = 2; suffix < 10_000; suffix++) {
            String candidate = baseSlug + "-" + suffix;
            if (!isTaken.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Exhausted slug suffixes for base: " + baseSlug);
    }
}
