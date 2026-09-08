package com.supportme.organization.service;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;
import org.springframework.stereotype.Component;

/**
 * Sanitizes the rich-text "about" page content before it's persisted. The organization's
 * wizytowka is guest-visible (no auth) HTML rendered by every visitor's browser, so this is a
 * stored-XSS boundary: allow only the formatting a rich-text editor legitimately produces,
 * strip everything else (scripts, event handlers, inline styles, iframes, ...).
 */
@Component
class AboutContentSanitizer {

    private final PolicyFactory policy = Sanitizers.FORMATTING
            .and(Sanitizers.BLOCKS)
            .and(Sanitizers.LINKS)
            .and(Sanitizers.STYLES)
            .and(Sanitizers.TABLES)
            .and(new HtmlPolicyBuilder()
                    .allowElements("img")
                    .allowAttributes("src", "alt").onElements("img")
                    .allowStandardUrlProtocols()
                    .toFactory());

    String sanitize(String rawHtml) {
        if (rawHtml == null) {
            return null;
        }
        return policy.sanitize(rawHtml);
    }
}
