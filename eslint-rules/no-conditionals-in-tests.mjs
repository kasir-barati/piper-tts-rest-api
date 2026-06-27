/**
 * @fileoverview Disallow conditional logic inside test cases.
 *
 * Tests must follow a linear, predictable execution path. Anywhere inside the body of an `it(...)` / `test(...)` callback (including nested callbacks to `forEach`, `then`, etc.) the following are not allowed:
 *
 * - `if else` statements.
 * - ternary expressions (`a ? b : c`).
 * - `switch` statements.
 * - logical short-circuit used as control flow (`a && doX()`, `a || doX()`) when written as an expression statement.
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

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow conditional logic (if/else, ternary, switch, short-circuit control flow) inside `it`/`test` callbacks. Tests must follow a linear, predictable execution path.",
    },
    schema: [],
    messages: {
      noIf: "Avoid `if`/`else` inside tests. Tests must follow a linear, predictable execution path. Split into multiple `it` cases or move setup into the Arrange stage.",
      noTernary:
        "Avoid ternary expressions inside tests. Inline the concrete value for this case or split into separate `it` cases.",
      noSwitch:
        "Avoid `switch` inside tests. Tests must follow a linear, predictable execution path. Split into separate `it` cases.",
      noShortCircuit:
        "Avoid using `{{op}}` for control flow inside tests. Inline the expected branch or split into separate `it` cases.",
    },
  },

  create(context) {
    // Stack of `booleans: true` while we are inside the body of an `it`/`test` callback. Pushed on enter, popped on exit. We push `false` for any other function so that nested helper functions defined inside a test still count as "inside a test" via the outer-frame check.
    let testDepth = 0;

    function enterFunction() {
      // no-op marker; depth is only updated by the `it`/`test` CallExpression visitor below.
    }

    function isInsideTest() {
      return testDepth > 0;
    }

    return {
      CallExpression(node) {
        if (isTestCall(node)) {
          // The callback argument's body is what we want to track. We bump depth on entry to the CallExpression and decrement on exit.
          testDepth++;
        }
      },
      "CallExpression:exit"(node) {
        if (isTestCall(node)) {
          testDepth--;
        }
      },

      IfStatement(node) {
        if (isInsideTest()) {
          context.report({ node, messageId: "noIf" });
        }
      },
      ConditionalExpression(node) {
        if (isInsideTest()) {
          context.report({ node, messageId: "noTernary" });
        }
      },
      SwitchStatement(node) {
        if (isInsideTest()) {
          context.report({ node, messageId: "noSwitch" });
        }
      },
      // Only flag short-circuits when they're used as a statement (control flow), not when they're computing a value (e.g. `const x = a ?? b`).
      "ExpressionStatement > LogicalExpression"(node) {
        if (!isInsideTest()) {
          return;
        }
        if (node.operator === "&&" || node.operator === "||") {
          context.report({
            node,
            messageId: "noShortCircuit",
            data: { op: node.operator },
          });
        }
      },
    };
  },
};
