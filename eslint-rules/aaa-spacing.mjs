/**
 * @fileoverview Enforce AAA (Arrange, Act, Assert) test layout.
 *
 * Inside the body of every `it(...)` / `test(...)` callback:
 * - At most 3 blank-line-separated groups of lines (AAA).
 * - No consecutive blank lines.
 * - No blank line at the very start or end of the body.
 *
 * Sections are detected from raw source lines between the opening `{` and the closing `}` of the test callback body. A line is considered "blank" when it contains only whitespace. Comment lines count as content (they belong to the section they sit in). This lets you write a `// Arrange` comment as the first line of the Arrange section without the rule misfiring.
 */

const TEST_NAMES = new Set(["it", "test", "fit", "xit", "xtest"]);

function isTestCall(node) {
  const callee = node.callee;

  if (callee.type === "Identifier") {
    return TEST_NAMES.has(callee.name);
  }
  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier"
  ) {
    return TEST_NAMES.has(callee.object.name);
  }

  return false;
}

function getTestBody(callExpr) {
  for (const arg of callExpr.arguments) {
    if (
      (arg.type === "FunctionExpression" ||
        arg.type === "ArrowFunctionExpression") &&
      arg.body &&
      arg.body.type === "BlockStatement"
    ) {
      return arg.body;
    }
  }

  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce AAA (Arrange, Act, Assert) test layout: at most 3 blank-line-separated sections inside `it`/`test` callbacks, and no consecutive/leading/trailing blank lines.",
    },
    schema: [],
    messages: {
      tooManySections:
        "Test body has {{count}} blank-line-separated sections. AAA tests must have at most 3 (Arrange, Act, Assert). Remove blank lines between statements that belong to the same stage.",
      leadingBlank: "Unexpected blank line at the start of test body.",
      trailingBlank: "Unexpected blank line at the end of test body.",
      multipleBlanks:
        "Unexpected consecutive blank lines inside test body. Use a single blank line to separate AAA stages.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const lines = sourceCode.lines; // 0-indexed array, line N is lines[N-1]

    function isBlank(lineText) {
      return /^\s*$/.test(lineText);
    }

    function checkTestBody(block) {
      const openBrace = sourceCode.getFirstToken(block);
      const closeBrace = sourceCode.getLastToken(block);
      const openLine = openBrace.loc.end.line; // line containing `{`
      const closeLine = closeBrace.loc.start.line; // line containing `}`

      // Single-line body, e.g. `it('x', () => { expect(a).toBe(b) })` - nothing to check.
      if (closeLine <= openLine) {
        return;
      }

      // Lines strictly between the `{` line and the `}` line.
      // We also consider any trailing content on the open-brace line and any
      // leading content on the close-brace line, but in practice those only
      // happen on collapsed bodies which we already skipped.
      const innerLines = [];
      for (let ln = openLine + 1; ln <= closeLine - 1; ln++) {
        innerLines.push({
          line: ln,
          text: lines[ln - 1] ?? "",
          blank: isBlank(lines[ln - 1] ?? ""),
        });
      }

      if (innerLines.length === 0) {
        return;
      }

      // Leading blank.
      if (innerLines[0].blank) {
        context.report({
          loc: {
            start: { line: innerLines[0].line, column: 0 },
            end: { line: innerLines[0].line, column: 1 },
          },
          messageId: "leadingBlank",
        });
      }

      // Trailing blank.
      const last = innerLines[innerLines.length - 1];
      if (last.blank) {
        context.report({
          loc: {
            start: { line: last.line, column: 0 },
            end: { line: last.line, column: 1 },
          },
          messageId: "trailingBlank",
        });
      }

      // Consecutive blanks + section counting.
      let sectionCount = 0;
      let inSection = false;
      let prevBlank = false;
      for (const { line, blank } of innerLines) {
        if (blank) {
          if (prevBlank) {
            context.report({
              loc: {
                start: { line, column: 0 },
                end: { line, column: 1 },
              },
              messageId: "multipleBlanks",
            });
          }
          inSection = false;
          prevBlank = true;
          continue;
        }

        if (!inSection) {
          sectionCount++;
          inSection = true;
        }
        prevBlank = false;
      }

      if (sectionCount > 3) {
        context.report({
          node: block,
          messageId: "tooManySections",
          data: { count: String(sectionCount) },
        });
      }
    }

    return {
      CallExpression(node) {
        if (!isTestCall(node)) {
          return;
        }

        const body = getTestBody(node);

        if (!body) {
          return;
        }

        checkTestBody(body);
      },
    };
  },
};
