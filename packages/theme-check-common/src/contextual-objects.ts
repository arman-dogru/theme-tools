/**
 * Liquid objects that are only defined in some file contexts. They are not
 * global in the docset (`access.global === false`, no `access.template`), so
 * `UndefinedObject` and the language server's `TypeSystem` both look them up
 * here by file path.
 *
 * Only the object lists are shared. Each consumer still classifies the file
 * itself (`UndefinedObject` with `relativePath.startsWith(...)`, `TypeSystem`
 * with path regexes), so the two can still disagree on unusual paths. Sharing
 * that classification as well is a possible follow-up.
 */

/**
 * Objects a section file can read directly. `comment` is here because, once a
 * `new_comment` form is posted, the `comment` object becomes globally available
 * (upstream ec1fbd7, #352). Horizon's snippets/blog-comment-form.liquid reads
 * `comment.status` inside its `new_comment` form.
 */
export const SECTION_CONTEXTUAL_OBJECTS: readonly string[] = Object.freeze([
  'section',
  'predictive_search',
  'recommendations',
  'comment',
]);

/**
 * Objects available in a theme app extension's app blocks and in the snippets
 * they render (snippets in an app extension can only be rendered from blocks).
 */
export const APP_BLOCK_CONTEXTUAL_OBJECTS: readonly string[] = Object.freeze([
  'app',
  'section',
  'recommendations',
  'block',
]);

/**
 * Objects *potentially* available in a theme's blocks and snippets.
 *
 * A theme block is rendered inside a section, and a snippet is usually
 * rendered from a section or a block. Shopify's `render` docs say a rendered
 * snippet can read "any objects that are directly accessible outside the
 * snippet", e.g. a snippet inside a section can access `section`. So whatever
 * a section can read (SECTION_CONTEXTUAL_OBJECTS), plus `block` and `app`,
 * may be readable here.
 *
 * This is not a guarantee. The file path does not say who renders the file: a
 * snippet can also be rendered directly from a layout or template (e.g.
 * `layout/theme.liquid` doing `{% render 'search-results' %}`), where these
 * objects are not defined, and they are still accepted there. This is the same
 * broad allowance upstream already makes for `section` and `block` in
 * snippets; precise caller-context analysis is out of scope.
 *
 * Tag-scoped variables (`form`, `paginate`, `forloop`, ...) are not objects of
 * the section and are not passed by `render`, so they are not in this list.
 */
export const THEME_BLOCK_AND_SNIPPET_CONTEXTUAL_OBJECTS: readonly string[] = Object.freeze([
  'app',
  'block',
  ...SECTION_CONTEXTUAL_OBJECTS,
]);

/** Objects only available in layout/checkout.liquid. */
export const CHECKOUT_LAYOUT_CONTEXTUAL_OBJECTS: readonly string[] = Object.freeze([
  'locale',
  'direction',
  'skip_to_content_link',
  'checkout_html_classes',
  'checkout_stylesheets',
  'checkout_scripts',
  'content_for_logo',
  'breadcrumb',
  'order_summary_toggle',
  'content_for_order_summary',
  'alternative_payment_methods',
  'content_for_footer',
  'tracking_code',
]);
