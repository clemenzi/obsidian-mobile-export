---
title: Obsidian Markdown Test
aliases:
  - Markdown Test
tags:
  - test
  - obsidian
cssclasses:
  - test-note
---

# Obsidian Markdown Test

This file is intended to test **normal Obsidian Markdown export**.

---

## 1. CommonMark

### Paragraphs

This is a normal paragraph.

This is another paragraph with **bold**, *italic*, ***bold italic***, `inline code`, and an escaped \*asterisk\*.

### Headings

#### Heading 4

##### Heading 5

###### Heading 6

### Horizontal rule

---

### Blockquotes

> Simple blockquote.
>
> Second paragraph inside the blockquote.
>
> > Nested blockquote.

### Lists

- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3

1. First
2. Second
   1. Nested ordered item
   2. Another nested item
3. Third

### Links

[Obsidian](https://obsidian.md)

<https://obsidian.md>

### Standard Markdown image

![Obsidian logo](https://obsidian.md/images/obsidian-logo-gradient.svg)

### Code

Inline: `const value = 42;`

```ts
function hello(name: string): string {
	return `Hello, ${name}!`;
}

console.log(hello("Obsidian"));
```

### HTML

<strong>Raw HTML bold</strong>

<details>
<summary>HTML details</summary>

HTML content.

</details>

---

## 2. GFM

### Strikethrough

~~This text is deleted.~~

### Task lists

- [ ] Not completed
- [x] Completed
- [ ] Parent task
  - [x] Nested completed task
  - [ ] Nested incomplete task

### Table

| Feature | Supported | Notes |
| --- | :---: | --- |
| CommonMark | ✅ | Base syntax |
| GFM | ✅ | Extended syntax |
| Obsidian | ✅ | Custom extensions |

### Autolink literal

https://github.com/clemenzi/obsidian-mobile-export

Contact: test@example.com

### Footnotes

A sentence with a footnote.[^1]

Another reference.[^long-note]

[^1]: This is a simple footnote.
[^long-note]: This is a longer footnote with **formatting** and `code`.

---

## 3. Math

Inline math: $E = mc^2$

More inline math: $\sin^2(x) + \cos^2(x) = 1$

Block math:

$$
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Another block:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

---

## 4. Obsidian highlights

Normal ==highlighted text== inside a paragraph.

==Entire highlighted sentence.==

Highlight mixed with **bold**, *italic*, and `code`.

---

## 5. Wikilinks

[[Example Note]]

[[Example Note|Custom alias]]

[[Example Note#Example heading]]

[[Example Note#Example heading|Heading alias]]

[[Example Note#^example-block]]

[[Example Note#^example-block|Block alias]]

Same-file heading link:

[[#Callouts]]

---

## 6. Embeds

### Note embed

![[Example Note]]

### Heading embed

![[Example Note#Example heading]]

### Block embed

![[Example Note#^example-block]]

### Image embed

![[example-image.png]]

### Image embed with width

![[example-image.png|300]]

### PDF embed

![[example.pdf]]

---

## 7. Obsidian comments

Text before comment.

%% This comment should not appear in exported output. %%

Text after comment.

%%
This is a
multiline Obsidian comment.

**Markdown inside this comment should not render.**
%%

Inline comment: visible text %%hidden text%% visible text.

---

## 8. Block IDs

This paragraph has a block identifier. ^example-block

- List item with a block ID. ^list-block

> Quote with block ID. ^quote-block

The `^example-block`, `^list-block`, and `^quote-block` identifiers should not appear in the final rendered document.

---

# Callouts

## 9. Basic callouts

> [!note]
> This is a note callout.

> [!info]
> This is an info callout.

> [!tip]
> This is a tip callout.

> [!success]
> This is a success callout.

> [!question]
> This is a question callout.

> [!warning]
> This is a warning callout.

> [!failure]
> This is a failure callout.

> [!danger]
> This is a danger callout.

> [!bug]
> This is a bug callout.

> [!example]
> This is an example callout.

> [!quote]
> This is a quote callout.

---

## 10. Callout titles

> [!note] Custom title
> This callout has a custom title.

> [!warning] **Formatted title**
> This tests formatting in a title.

---

## 11. Foldable callouts

For static HTML/PDF export, both should normally render expanded.

> [!note]+ Expanded callout
> Content of the `+` callout.

> [!note]- Collapsed callout
> Content of the `-` callout.

---

## 12. Custom callout type

> [!my-custom-callout] Custom type
> Unknown/custom callout types should still render with a sensible fallback.

---

## 13. Rich callout content

> [!tip] Rich content
> A callout can contain **bold**, *italic*, ==highlight==, `inline code`, and [links](https://obsidian.md).
>
> - List item
> - Another item
>
> ```js
> console.log("code inside callout");
> ```
>
> Inline math: $a^2+b^2=c^2$

---

## 14. Nested callouts

> [!note] Outer callout
> Outer content.
>
> > [!warning] Inner callout
> > Nested callout content.
> >
> > - Nested item 1
> > - Nested item 2
>
> Back to the outer callout.

---

## 15. Callout with regular nested blockquote

> [!info] Callout
> Callout content.
>
> > This is a normal nested blockquote, not another callout.

---

## 16. Mixed syntax

> [!example] Mixed syntax test
> **Bold**, *italic*, ~~strike~~, ==highlight==, `code`, and $x^2$.
>
> [[Example Note|Wikilink alias]]
>
> - [ ] Task
> - [x] Completed task
>
> | A | B |
> | --- | --- |
> | 1 | 2 |
>
> %% This should be hidden. %%

---

## 17. Edge cases

### Special characters

Ampersand: &

Less/greater than: < >

Quotes: "double" and 'single'

Entities: &copy; &amp; &lt; &gt;

### Escaping

\# Not a heading

\> Not a quote

\- Not a list item

\[[Not a wikilink]]

\==Not a highlight==

### Inline combinations

**Bold with *italic inside*.**

***Bold italic together.***

~~Strike with **bold** inside.~~

==Highlight with **bold** inside.==

[**Bold link**](https://obsidian.md)

---

## 18. End marker

If this heading renders correctly and no unsupported syntax leaks into the output, the parser reached the end of the test file successfully.
