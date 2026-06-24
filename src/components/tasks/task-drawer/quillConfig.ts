// Quill config for the Task description editor.
// Extracted from DetailsTab so the allow-list is unit-testable without mounting Quill.
// Quill strips any format not in `quillFormats` on BOTH typing and paste, so this
// list is what makes nested bullets (indent) and pasted email formatting survive.

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "link"],
    ["clean"],
  ],
};

export const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "indent",
  "blockquote",
  "link",
];
