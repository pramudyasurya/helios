import { describe, expect, it } from "vitest";
import { evaluateA11yViolations, formatA11yFingerprintMessage } from "@/lib/shared/domain/a11y";
import type { A11yViolation } from "@/lib/shared/domain/types";

describe("evaluateA11yViolations", () => {
  it("emits passed check when there are zero violations", () => {
    const checks = evaluateA11yViolations([]);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      title: "Accessibility (WCAG AA)",
      status: "passed",
      severity: "info",
    });
  });

  it("emits failed check with high severity when critical violations exist", () => {
    const violations: A11yViolation[] = [
      {
        id: "color-contrast",
        impact: "critical",
        description: "Elements must have sufficient color contrast",
        help: "Elements must have sufficient color contrast",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/color-contrast",
        nodes: [{ target: ["button.btn-primary"], html: "<button>Submit</button>" }],
      },
    ];
    const checks = evaluateA11yViolations(violations);
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("failed");
    expect(checks[0].severity).toBe("high");
    expect(checks[0].detail).toContain("1 critical");
  });

  it("emits warning check with low severity when only moderate or minor violations exist", () => {
    const violations: A11yViolation[] = [
      {
        id: "heading-order",
        impact: "moderate",
        description: "Heading levels should only increase by one",
        help: "Heading levels should only increase by one",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/heading-order",
        nodes: [{ target: ["h3"], html: "<h3>Title</h3>" }],
      },
    ];
    const checks = evaluateA11yViolations(violations);
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("warning");
    expect(checks[0].severity).toBe("low");
  });

  it("formats fingerprint message deterministically", () => {
    const msg = formatA11yFingerprintMessage(
      {
        id: "image-alt",
        impact: "critical",
        description: "",
        help: "",
        helpUrl: "",
        nodes: [],
      },
      "img.hero",
    );
    expect(msg).toBe("a11y:image-alt:img.hero");
  });
});
