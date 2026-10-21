<!-- DRAFT for Shopify/theme-tools, for Arman to review, edit and open himself.
     Head branch: arman-dogru:upstream-944-section-objects-in-theme-snippets (2 commits, 4ba504e + eace325, on upstream main 20f8edf; upstream squash-merges).
     Before opening: replace the two "Drag in" lines below with the PNGs. Download them from the pinned links
     (or from docs/fixes/944-predictive-search-snippets/ on fork branch fix/944-predictive-search-in-doc-snippets at 5ca4a59)
     and drag them into the GitHub editor, so they're uploaded to the upstream PR rather than linked to the fork.
     Upstream's CLA check will ask you to sign. -->

**AI assistance disclosure:** This change was investigated, implemented and tested with help from AI coding agents. I've reviewed the full diff and the before/after results, and I'm responsible for the reasoning and test plan.

## What are you adding in this PR?

Refs #944. This doesn't close it: the thread also asks for `form` and `paginate`, which stay reported on purpose (see below).

`UndefinedObject` reports the section objects (`predictive_search`, `recommendations`, `comment`) as unknown in theme-mode snippets that use `{% doc %}`, and in theme blocks. #1267 fixed `section` and `block` for snippets. But a snippet rendered from the predictive search or product recommendations section still gets `Unknown object 'predictive_search' used.` / `'recommendations'`, and so does a theme block placed in those sections.

The rule this PR applies comes from the [`render` docs](https://shopify.dev/docs/api/liquid/tags/render): a rendered snippet can access "any objects that are directly accessible outside the snippet … a snippet … inside a section can access the `section` object". A theme block is rendered inside a section, and a snippet is usually rendered from a section or block. So theme blocks and theme-mode snippets are treated as *potentially* able to read everything a section can read (`section`, `predictive_search`, `recommendations`, `comment`), plus `app` and `block`. `predictive_search` and `recommendations` have the same shopify.dev restriction (results only when the section is rendered through their API and the Section Rendering API), so they are now treated the same way.

This is potential contextual availability, not a guarantee. The check only sees the file path, not the caller: a snippet can also be rendered straight from a layout or template (e.g. `layout/theme.liquid` doing `{% render 'search-results' %}`), where these objects aren't defined, and such a snippet is accepted too. That's the same broad allowance main already makes for `section` and `block` in snippets (#1267). The repro includes that case as a documented known limitation; precise caller analysis is out of scope here.

#1267 also changed only the check. The language server kept typing only `app` in theme-mode snippets, so the editor stopped warning about `section` there but still gave no completion or hover for `section.`. This PR moves the contextual-object definitions into `@shopify/theme-check-common` (`contextual-objects.ts`, frozen with `Object.freeze`) and uses them in both `UndefinedObject` and `TypeSystem`, so the two share the same object lists. The file-context classification is *not* shared: the check uses `relativePath.startsWith(...)` and `TypeSystem` uses path regexes, so they can still disagree on unusual paths. One parity test imports the shared lists; the other new tests use literal expectations. Note that the `TypeSystem` change applies to every theme-mode snippet. It is not gated on `{% doc %}` the way the check is.

`ObjectCompletionProvider.spec.ts`: "should not complete block-level contextual variables in snippets when in theme mode" (from #346's fix) expected no `section` completion in theme snippets. That matched the check at the time, but #1267 left the language server inconsistent with the check. The test is replaced by positive completion tests for snippets and blocks, plus a negative test for templates.

Still reported, on purpose:
- `form`, `paginate`: tag-scoped variables. `render` uses an isolated subcontext and does not pass them (Dawn passes `paginate: paginate` explicitly).
- Section objects used directly in templates, layouts and other files.
- App-mode blocks and snippets: unchanged.

## What's next? Any followup issues?

- #944's `form`/`paginate` request: I'd suggest answering it in the thread (pass them as `@param`s) rather than allowing them.
- `comment` is now allowed in theme blocks and snippets under the same rule. It's in the sections list because, once a `new_comment` form is posted, `comment` becomes globally available (ec1fbd7, #352). Horizon's `snippets/blog-comment-form.liquid` reads `comment.status` inside its `new_comment` form; the repro and an LS probe cover it.
- Sharing the file-context classification (the `startsWith` vs regex path tests) between the check and `TypeSystem` would close the remaining parity gap. Not in this PR.
- Widening theme **blocks** (adding `predictive_search` and `comment` there) isn't needed for #944's snippet case. If you'd rather keep this PR to snippets, I'm happy to split the blocks change into a separate PR.

## What did you learn?

When the check and the language server each keep their own copy of a list, they drift apart. Sharing the definitions is a cheap way to stop that, though each side still decides which kind of file it's looking at.

## Tophatting

Repro theme: a predictive search section rendering a doc'd snippet and holding a theme block, a recommendations section rendering a doc'd snippet, an article section rendering a doc'd comment-form snippet (modelled on Horizon's) that reads `comment.status` inside `{% form 'new_comment' %}`, a snippet rendered only from `layout/theme.liquid` (the known limitation), plus true positives. Only `UndefinedObject` enabled; base is main.

| Offense | main | this PR |
| --- | --- | --- |
| `blocks/predictive-search-terms.liquid:2:7` 'predictive_search' | reported | gone |
| `snippets/predictive-search-results.liquid:7:25`, `:8:22` 'predictive_search' | reported | gone |
| `snippets/blog-comment-form.liquid:8:10` 'comment' | reported | gone |
| `snippets/recommendation-list.liquid:6:23`, `:7:20` 'recommendations' | reported | gone |
| `snippets/layout-rendered-search.liquid:9:21` 'predictive_search' (rendered only from the layout) | reported | accepted (**known limitation**, see above) |
| `layout/theme.liquid:8:8` 'predictive_search' | reported | reported |
| `templates/search.liquid:2:4` 'recommendations' | reported | reported |
| `snippets/true-positives.liquid` 'form', 'paginate', 'undefined_thing' | reported | reported |
| **Total** | **12** | **5** |

_Drag in `before-after.png` here: [https://github.com/arman-dogru/theme-tools/blob/5ca4a599bb5d73f47760df5331b12ccac3fe1a84/docs/fixes/944-predictive-search-snippets/before-after.png](https://github.com/arman-dogru/theme-tools/blob/5ca4a599bb5d73f47760df5331b12ccac3fe1a84/docs/fixes/944-predictive-search-snippets/before-after.png?raw=true) (UndefinedObject offenses on the repro theme, before vs after)._

Language server, using the docset bundled by `pnpm build` (`packages/theme-check-docs-updater/data`, revision 40f966f) through `CompletionsProvider` / `HoverProvider`, theme mode unless noted:

| Probe | main | this PR |
| --- | --- | --- |
| `snippets/s.liquid` `{{ pre█ }}` | none | `predictive_search` |
| `snippets/s.liquid` `{{ predictive_search.█ }}` | none | performed, resources, terms, types |
| `snippets/s.liquid` `{{ recommendations.█ }}` | none | intent, performed?, products, products_count |
| `snippets/s.liquid` `{{ section.█ }}` | none | blocks, id, index, index0, location, settings |
| `snippets/s.liquid` `{% for p in predictive_search.resources.products %}{{ p.ti█ }}` | none | title |
| `blocks/b.liquid` `{{ predictive_search.█ }}` | none | performed, resources, terms, types |
| `snippets/s.liquid` `{% form 'new_comment', article %}{{ comment.█ }}` | none | author, content, created_at, email, id, status, updated_at, url |
| hover `predictive_search` in a snippet | null | object docs |
| hover `comment` in a snippet | null | object docs |
| control: `templates/search.liquid` `{{ predictive_search.█ }}` | none | none |
| control: app-mode snippet `{{ pre█ }}` | none | none |
| control: hover `recommendations` in a block | docs | docs |

_Drag in `ls-before-after.png` here: [https://github.com/arman-dogru/theme-tools/blob/5ca4a599bb5d73f47760df5331b12ccac3fe1a84/docs/fixes/944-predictive-search-snippets/ls-before-after.png](https://github.com/arman-dogru/theme-tools/blob/5ca4a599bb5d73f47760df5331b12ccac3fe1a84/docs/fixes/944-predictive-search-snippets/ls-before-after.png?raw=true) (language server completion/hover probes, before vs after)._

Dawn 16.0.0 and Horizon (dfad90d), all checks: 9 / 9 and 6 / 6 offenses before and after, with identical lines.

Tests added in this PR, besides the snippet and block allowances:
- regression tests for inference and completion of `predictive_search.resources.products` (and the loop variable) in a doc-tagged snippet;
- negative app-mode tests: `predictive_search` and `comment` are neither typed nor completed in app-mode snippets;
- a test that pins the known limitation (a snippet rendered only from a layout is accepted).

The 3 touched spec files fail 12 tests on main's sources (184 passed, 1 skipped) and pass on this branch (196 passed, 1 skipped). The app-mode negatives fall into two groups. The completion test and the app-mode inference assertions pass on main too, as guards. The inference test also asserts that theme mode is typed, and that assertion is what fails on main. Full `CI=true vitest run` on Node 20, 22 and 24: 272 files passed (1 skipped), 7192 passed, 5 skipped. `pnpm -r type-check` and prettier are clean.

- [x] I added screenshots of the changes (before and after the changes if applicable)

## Before you deploy

<!-- Public API changes, new features -->
- [x] I included a minor bump `changeset` (theme-check-common: 4 new exported lists; theme-language-server-common: patch)
- [x] My feature is backward compatible
