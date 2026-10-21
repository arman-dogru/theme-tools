// Usage: node ls-capture.mjs <theme-tools-root>
// Drives the built language server's CompletionsProvider and HoverProvider with
// the real Shopify docset (theme-check-docs-updater) on small theme files and
// prints one tab-separated line per probe: id, mode, file, source, result.
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const ls = (p) => import(path.join(root, 'packages/theme-language-server-common/dist', p));
const { CompletionsProvider } = await ls('completions/CompletionsProvider.js');
const { HoverProvider } = await ls('hover/HoverProvider.js');
const { DocumentManager } = await ls('documents/DocumentManager.js');
const { ThemeLiquidDocsManager } = await import(
  path.join(root, 'packages/theme-check-docs-updater/dist/index.js')
);

const docset = new ThemeLiquidDocsManager();
const noMetafields = async () => ({
  article: [],
  blog: [],
  collection: [],
  company: [],
  company_location: [],
  location: [],
  market: [],
  order: [],
  page: [],
  product: [],
  variant: [],
  shop: [],
});

const probes = [
  // [id, mode, file, source with █ as the cursor, kind]
  ['C1', 'theme', 'snippets/s.liquid', '{{ pre█ }}', 'complete'],
  ['C2', 'theme', 'snippets/s.liquid', '{{ predictive_search.█ }}', 'complete'],
  ['C3', 'theme', 'snippets/s.liquid', '{{ recommendations.█ }}', 'complete'],
  ['C4', 'theme', 'snippets/s.liquid', '{{ section.█ }}', 'complete'],
  [
    'C5',
    'theme',
    'snippets/s.liquid',
    '{% for p in predictive_search.resources.products %}{{ p.ti█ }}{% endfor %}',
    'complete',
  ],
  ['C6', 'theme', 'blocks/b.liquid', '{{ predictive_search.█ }}', 'complete'],
  ['H1', 'theme', 'snippets/s.liquid', '{{ predictive_sea█rch }}', 'hover'],
  ['H2', 'theme', 'blocks/b.liquid', '{{ recommenda█tions }}', 'hover'],
  ['K1', 'theme', 'templates/search.liquid', '{{ predictive_search.█ }}', 'complete'],
  ['K2', 'app', 'snippets/s.liquid', '{{ pre█ }}', 'complete'],
];

for (const [id, mode, file, marked, kind] of probes) {
  const documentManager = new DocumentManager();
  const uri = `file:///theme/${file}`;
  const offset = marked.indexOf('█');
  const source = marked.replace('█', '');
  documentManager.open(uri, source, 1);
  const position = { line: 0, character: offset };
  const params = { textDocument: { uri }, position };
  const getModeForURI = async () => mode;
  let result;
  if (kind === 'complete') {
    const provider = new CompletionsProvider({
      documentManager,
      themeDocset: docset,
      getMetafieldDefinitions: noMetafields,
      getModeForURI,
    });
    const items = await provider.completions(params);
    const labels = items.map((i) => i.label).sort();
    result = labels.length ? `${labels.length}: ${labels.join(', ')}` : '(none)';
  } else {
    const provider = new HoverProvider(
      documentManager,
      docset,
      noMetafields,
      undefined,
      undefined,
      undefined,
      getModeForURI,
    );
    const hover = await provider.hover(params);
    const value = hover?.contents?.value ?? null;
    result = value ? value.split('\n')[0] : '(null)';
  }
  console.log([id, mode, file, marked, result].join('\t'));
}
