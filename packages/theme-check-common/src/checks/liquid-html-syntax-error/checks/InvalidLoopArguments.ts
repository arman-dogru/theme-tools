import {
  ForMarkup,
  LiquidTag,
  LiquidTagFor,
  LiquidTagTablerow,
  NodeTypes,
} from '@shopify/liquid-html-parser';
import { Problem, SourceCodeType, TagEntry } from '../../..';
import {
  doesFragmentContainUnsupportedParentheses,
  getFragmentsInMarkup,
  fragmentKeyValuePair,
} from './utils';
import { isLoopLiquidTag } from '../../utils';

export function detectInvalidLoopArguments(
  node: LiquidTag,
  tags: TagEntry[] = [],
): Problem<SourceCodeType.LiquidHtml> | undefined {
  if (node.type === NodeTypes.LiquidTag && !isLoopLiquidTag(node)) {
    return;
  }

  const markup: ForMarkup | string = (node as LiquidTagFor | LiquidTagTablerow).markup;

  if (!markup) {
    return;
  }

  // `argumentFragments` are the fragments after `<variable> in <collection>`, with indices relative
  // to `argumentsOffset` (an absolute offset into node.source).
  let argumentFragments: { value: string; index?: number }[];
  let argumentsOffset: number;

  if (typeof markup !== 'string') {
    // The markup parsed, so the parser already knows where `<collection>` ends. Only tokenize what
    // follows it. Tokenizing the whole markup would split collection expressions that contain
    // whitespace, e.g. `product.options_by_name['hello world'].values`, and the autofix would then
    // delete part of the collection.
    argumentsOffset = markup.collection.position.end;
    argumentFragments = getFragmentsInMarkup(
      node.source.slice(argumentsOffset, markup.position.end),
    );
  } else {
    // The markup did not parse. Fall back to the fragment tokenizer, which keeps quoted strings,
    // ranges and bracketed lookups together.
    const fragments = getFragmentsInMarkup(markup);

    // The first three fragments are: `<variable> in <array>`
    // If they haven't started typing the tag, we don't want to report an error.
    if (fragments.length <= 3) {
      return;
    }

    argumentsOffset = node.source.indexOf(markup, node.position.start);
    argumentFragments = fragments.slice(3);
  }

  if (argumentFragments.length === 0 || argumentsOffset < 0) {
    return;
  }

  const startIndex = argumentsOffset + argumentFragments.at(0)!.index!;
  const endIndex =
    argumentsOffset + argumentFragments.at(-1)!.index! + argumentFragments.at(-1)!.value.length;

  const filteredFragments: string[] = [];

  // Positional arguments are ignored if they come after invalid positional args or named args
  let noMorePositionalArguments = false;
  const invalidFragments: string[] = [];

  for (const fragment of argumentFragments) {
    if (doesFragmentContainUnsupportedParentheses(fragment.value)) {
      noMorePositionalArguments = true;
      invalidFragments.push(fragment.value);
      continue;
    }

    const keyValuePair = fragmentKeyValuePair(fragment.value);

    // Named arg is found
    if (keyValuePair) {
      noMorePositionalArguments = true;

      if (!isSupportedTagArgument(tags, node.name, keyValuePair.key, false)) {
        invalidFragments.push(fragment.value);
        continue;
      }
    }
    // Unsupported positional arg is found
    else if (
      noMorePositionalArguments ||
      !isSupportedTagArgument(tags, node.name, fragment.value, true)
    ) {
      noMorePositionalArguments = true;
      invalidFragments.push(fragment.value);
      continue;
    }

    filteredFragments.push(fragment.value);
  }

  if (invalidFragments.length === 0) {
    return;
  }

  return {
    message: `Arguments must be provided in the format \`${
      node.name
    } in <array> <positional arguments> <named arguments>\`. Invalid/Unknown arguments: ${invalidFragments.join(
      ', ',
    )}`,
    startIndex,
    endIndex,
    fix: (corrector) => {
      corrector.replace(startIndex, endIndex, filteredFragments.join(' '));
    },
  };
}

function isSupportedTagArgument(
  tags: TagEntry[],
  tagName: string,
  key: string,
  positional: boolean,
) {
  return (
    tags
      .find((tag) => tag.name === tagName)
      ?.parameters?.some(
        (parameter) => parameter.name === key && parameter.positional === positional,
      ) || false
  );
}
