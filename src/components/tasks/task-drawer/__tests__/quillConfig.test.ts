import { describe, it, expect } from "vitest";
import { quillFormats, quillModules } from "../quillConfig";

// Flatten the toolbar (array of groups, each group an array of buttons/objects)
// into a list of the format keys it controls.
const toolbarKeys = (quillModules.toolbar as unknown[])
  .flat()
  .map((entry) =>
    typeof entry === "string" ? entry : Object.keys(entry as object)[0]
  );

describe("task editor quill config", () => {
  it("allows the formats needed for nesting + pasted email formatting", () => {
    // Pre-existing formats stay
    expect(quillFormats).toEqual(
      expect.arrayContaining(["bold", "italic", "underline", "list", "bullet", "link"])
    );
    // New formats that unblock the two reported issues
    expect(quillFormats).toContain("indent"); // nested bullets (Tab)
    expect(quillFormats).toContain("header"); // pasted headings
    expect(quillFormats).toContain("blockquote"); // pasted quotes
  });

  it("exposes header, indent, and blockquote controls in the toolbar", () => {
    expect(toolbarKeys).toContain("header");
    expect(toolbarKeys).toContain("indent");
    expect(toolbarKeys).toContain("blockquote");
  });
});
