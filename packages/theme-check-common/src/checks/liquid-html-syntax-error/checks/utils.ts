export const INVALID_SYNTAX_MESSAGE = 'Syntax is not supported';

export function getValuesInMarkup(markup: string) {
  return [...markup.matchAll(new RegExp(VALUE_PATTERN, 'g'))].map((match) => ({
    value: match[0],
    index: match.index,
  }));
}

const DOUBLE_QUOTED_STRING = `"[^"]*"`;
const SINGLE_QUOTED_STRING = `'[^']*'`;
// Lax parser does NOT complain about leading/trailing spaces inside ranges (e.g. `(1 .. 10 )`) and
// within the parenthesis (e.g. `( 1 .. 10 )`), but fails to render the liquid when using the gem.
// Strict parser does NOT complain, but still renders it.
// To avoid any issues, we will remove extra spaces.
const RANGE_MARKUP_COMPONENT_REGEX = `\\s*(-?\\d+(?:\\.\\d+)?|\\w+(?:\\.\\w+)*)\\s*`;
const RANGE_MARKUP_REGEX = `\\(\\s*${RANGE_MARKUP_COMPONENT_REGEX}(\\.{2,})\\s*${RANGE_MARKUP_COMPONENT_REGEX}\\s*\\)`;
// A balanced `[...]` lookup such as `['hello world']`, `[ "a, b" ]` or `[b['c d']]` (one level of
// nesting). Quoted strings inside the brackets are matched whole, so a quoted `]` does not close it.
const BRACKET_CONTENT = `(?:${DOUBLE_QUOTED_STRING}|${SINGLE_QUOTED_STRING}|[^\\[\\]'"])*`;
const BRACKETED_LOOKUP = `\\[(?:${DOUBLE_QUOTED_STRING}|${SINGLE_QUOTED_STRING}|\\[${BRACKET_CONTENT}\\]|[^\\[\\]'"])*\\]`;
// Tokens are separated by commas or spaces, except inside a bracketed lookup, where spaces and
// commas belong to the key (e.g. `product.options_by_name['hello world'].values` is one token).
// Unbalanced brackets fall through to the single-character branch, so no input is dropped.
const REGULAR_TOKEN = `(?:${BRACKETED_LOOKUP}|[^\\s,])+`;

// Quoted strings pattern (combination of double and single quoted)
const QUOTED_STRING = `(${DOUBLE_QUOTED_STRING}|${SINGLE_QUOTED_STRING})`;

// Value pattern for key-value pairs (can be quoted, parenthesized, or regular token)
const VALUE_PATTERN = `(${QUOTED_STRING}|${RANGE_MARKUP_REGEX}|${REGULAR_TOKEN})`;

// Key-value pair pattern
const KEY_VALUE_PAIR = `(\\S+):\\s*${VALUE_PATTERN}`;

const MARKUP_FRAGMENTS_PATTERN = new RegExp(
  `${QUOTED_STRING}|${RANGE_MARKUP_REGEX}|${KEY_VALUE_PAIR}|${REGULAR_TOKEN}`,
  'g',
);

export function getFragmentsInMarkup(markup: string) {
  return [...markup.matchAll(MARKUP_FRAGMENTS_PATTERN)].map((match) => ({
    value: match[0],
    index: match.index,
  }));
}

export function getRangeMatch(markup: string) {
  return markup.match(RANGE_MARKUP_REGEX);
}

export function doesFragmentContainUnsupportedParentheses(fragment: string) {
  if (getRangeMatch(fragment)) {
    return false;
  }

  return fragment.includes('(') || fragment.includes(')');
}

export function fragmentKeyValuePair(fragment: string) {
  const match = fragment.match(new RegExp(KEY_VALUE_PAIR));

  if (!match) {
    return;
  }

  const [, key, value] = match;

  return {
    key,
    value,
  };
}
