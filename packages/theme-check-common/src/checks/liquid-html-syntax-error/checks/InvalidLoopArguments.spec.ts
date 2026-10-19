import { expect, describe, it } from 'vitest';
import { applyFix, runLiquidCheck } from '../../../test';
import { LiquidHTMLSyntaxError } from '../index';

describe('detectInvalidLoopArguments', async () => {
  it('should not report when args are valid', async () => {
    const testCases = [
      `{% for i in array reversed %}{% endfor %}`,
      `{% for i in array reversed offset: 1 %}{% endfor %}`,
      `{% tablerow x in array limit: 10 %}{% endtablerow %}`,
      `{% tablerow x in array cols: 2 limit: 10 %}{% endtablerow %}`,
    ];

    for (const sourceCode of testCases) {
      const offenses = await testCheck(sourceCode);
      expect(offenses).to.have.length(0);
    }
  });

  it('should report when invalid args are found', async () => {
    const testCases = [
      [
        `{% for i in array limit1: 10 %}{% endfor %}`,
        '{% for i in array  %}{% endfor %}',
        'limit1: 10',
      ],
      [
        `{% for i in array !! range: (1..2) %}{% endfor %}`,
        '{% for i in array  %}{% endfor %}',
        '!!, range: (1..2)',
      ],
      [
        `{% tablerow i in (1..10) limit1: 10 %}{{ i }}{% endtablerow %}`,
        '{% tablerow i in (1..10)  %}{{ i }}{% endtablerow %}',
        'limit1: 10',
      ],
    ];

    for (const [sourceCode, expected, invalidArguments] of testCases) {
      const offenses = await testCheck(sourceCode);
      expect(offenses).to.have.length(1);
      expect(offenses[0].message).toEqual(
        expect.stringContaining(`Invalid/Unknown arguments: ${invalidArguments}`),
      );

      const fixed = applyFix(sourceCode, offenses[0]);
      expect(fixed).to.equal(expected);
    }
  });

  it('should report when positional args are found after named/invalid args', async () => {
    const testCases = [
      [
        `{% for i in array limit: 10 reversed %}{% endfor %}`,
        '{% for i in array limit: 10 %}{% endfor %}',
        'reversed',
      ],
      [
        `{% for i in array reversed limit: 10 invalid %}{% endfor %}`,
        '{% for i in array reversed limit: 10 %}{% endfor %}',
        'invalid',
      ],
      [
        `{% for i in array !! reversed limit: 10 invalid %}{% endfor %}`,
        '{% for i in array limit: 10 %}{% endfor %}',
        '!!, reversed, invalid',
      ],
      [
        `{% for i in array reversed: (1..2) %}{% endfor %}`,
        '{% for i in array  %}{% endfor %}',
        'reversed: (1..2)',
      ],
    ];

    for (const [sourceCode, expected, invalidArguments] of testCases) {
      const offenses = await testCheck(sourceCode);
      expect(offenses).to.have.length(1);
      expect(offenses[0].message).toEqual(
        expect.stringContaining(`Invalid/Unknown arguments: ${invalidArguments}`),
      );

      const fixed = applyFix(sourceCode, offenses[0]);
      expect(fixed).to.equal(expected);
    }
  });

  describe('quoted and bracketed lookups in the collection (issue #1204)', () => {
    it('should not report when the collection lookup has a quoted key containing spaces', async () => {
      const testCases = [
        // The exact form from the issue
        `{%- for value in product.options_by_name['hello world'].values -%}{{ value }}{%- endfor -%}`,
        `{% for value in product.options_by_name["hello world"].values %}{% endfor %}`,
        `{% tablerow value in product.options_by_name['Pack size'].values %}{% endtablerow %}`,
        // Commas inside the quoted key
        `{% for x in product.options_by_name['Size, Fit'].values %}{% endfor %}`,
        // Spaces inside the brackets themselves
        `{% for x in product.options_by_name[ 'Size' ].values %}{% endfor %}`,
        // Nested bracket lookups
        `{% for x in a[b['c d']] %}{% endfor %}`,
        `{% for x in a[b[c['d e']]] %}{% endfor %}`,
        // Collections the fragment tokenizer cannot keep together on its own (spaced range bounds
        // with lookups, deeper nesting): the parsed AST still knows where the collection ends
        `{% for i in ( 1 .. product.options_by_name['hello world'].values.size ) %}{% endfor %}`,
        `{% for i in (1 .. settings['max count']) limit: 2 %}{% endfor %}`,
        `{% for x in a[ b[c[d]] ] %}{% endfor %}`,
        // Quoted key inside a range bound
        `{% for i in (1..product.options_by_name['hello world'].values.size) %}{% endfor %}`,
        // Inside {% liquid %}
        `{% liquid\n  for value in product.options_by_name['hello world'].values\n    echo value\n  endfor\n%}`,
      ];

      for (const sourceCode of testCases) {
        const offenses = await testCheck(sourceCode);
        expect(offenses, sourceCode).to.have.length(0);
      }
    });

    it('should not report valid arguments that follow a quoted-key lookup', async () => {
      const testCases = [
        `{% for value in product.options_by_name['hello world'].values reversed %}{% endfor %}`,
        `{% for value in product.options_by_name['hello world'].values limit: 2 offset: 1 %}{% endfor %}`,
        `{% for value in product.options_by_name['hello world'].values, limit: 2 %}{% endfor %}`,
        `{% for value in product.options_by_name['hello world'].values reversed limit: 2 %}{% endfor %}`,
        `{% tablerow value in product.options_by_name['Pack size'].values cols: 2 limit: 4 %}{% endtablerow %}`,
        // Quoted key with spaces in a named argument's value
        `{% for value in product.options_by_name['hello world'].values limit: settings['max items'] %}{% endfor %}`,
      ];

      for (const sourceCode of testCases) {
        const offenses = await testCheck(sourceCode);
        expect(offenses, sourceCode).to.have.length(0);
      }
    });

    it('should still report (and safely fix) invalid arguments after a quoted-key lookup', async () => {
      const testCases = [
        [
          `{% for value in product.options_by_name['hello world'].values limit1: 2 %}{% endfor %}`,
          `{% for value in product.options_by_name['hello world'].values  %}{% endfor %}`,
          'limit1: 2',
        ],
        [
          `{% for value in product.options_by_name['hello world'].values limit: 2 reversed %}{% endfor %}`,
          `{% for value in product.options_by_name['hello world'].values limit: 2 %}{% endfor %}`,
          'reversed',
        ],
        [
          // Unparseable markup (falls back to the string tokenizer)
          `{% for value in product.options_by_name['hello world'].values !! %}{% endfor %}`,
          `{% for value in product.options_by_name['hello world'].values  %}{% endfor %}`,
          '!!',
        ],
        [
          `{% for value in product.options_by_name['Size, Fit'].values !! limit: 2 %}{% endfor %}`,
          `{% for value in product.options_by_name['Size, Fit'].values limit: 2 %}{% endfor %}`,
          '!!',
        ],
        [
          `{% tablerow value in product.options_by_name['Pack size'].values cols: 2 rows: 3 %}{% endtablerow %}`,
          `{% tablerow value in product.options_by_name['Pack size'].values cols: 2 %}{% endtablerow %}`,
          'rows: 3',
        ],
        [
          `{% for value in product.options_by_name['hello world'].values limit: 2 bad['x y'] %}{% endfor %}`,
          `{% for value in product.options_by_name['hello world'].values limit: 2 %}{% endfor %}`,
          "bad['x y']",
        ],
      ];

      for (const [sourceCode, expected, invalidArguments] of testCases) {
        const offenses = await testCheck(sourceCode);
        expect(offenses, sourceCode).to.have.length(1);
        expect(offenses[0].message).toEqual(
          expect.stringContaining(`Invalid/Unknown arguments: ${invalidArguments}`),
        );

        // The autofix must never cut into the collection expression
        const fixed = applyFix(sourceCode, offenses[0]);
        expect(fixed).to.equal(expected);
      }
    });

    it('should not offer a destructive autofix for the reported snippet', async () => {
      const sourceCode = `{%- for value in product.options_by_name['hello world'].values -%}\n  {{ value }}\n{%- endfor -%}`;
      const offenses = await testCheck(sourceCode);
      expect(offenses).to.have.length(0);
    });
  });

  it('should report when there are multiple instances of the error', async () => {
    const sourceCode = `{% for i in array reversed limit: 10 invalid %}{% endfor %} {% tablerow x in array cols: 2 limit: 10 invalid %}{% endtablerow %}`;

    const offenses = await testCheck(sourceCode);
    expect(offenses).to.have.length(2);
    for (const offense of offenses) {
      expect(offense.message).toEqual(
        expect.stringContaining(`Invalid/Unknown arguments: invalid`),
      );
    }

    const fixed = applyFix(sourceCode, offenses[0]);
    expect(fixed).to.equal(
      '{% for i in array reversed limit: 10 %}{% endfor %} {% tablerow x in array cols: 2 limit: 10 invalid %}{% endtablerow %}',
    );

    const fixed2 = applyFix(sourceCode, offenses[1]);
    expect(fixed2).to.equal(
      '{% for i in array reversed limit: 10 invalid %}{% endfor %} {% tablerow x in array cols: 2 limit: 10 %}{% endtablerow %}',
    );
  });
});

function testCheck(sourceCode: string) {
  return runLiquidCheck(LiquidHTMLSyntaxError, sourceCode, undefined, {
    themeDocset: {
      tags: () =>
        Promise.resolve([
          {
            name: 'for',
            parameters: [
              {
                name: 'reversed',
                positional: true,
                description: '...',
                required: false,
                types: [],
              },
              { name: 'limit', positional: false, description: '...', required: false, types: [] },
              { name: 'offset', positional: false, description: '...', required: false, types: [] },
            ],
          },
          {
            name: 'tablerow',
            parameters: [
              { name: 'cols', positional: false, description: '...', required: false, types: [] },
              { name: 'limit', positional: false, description: '...', required: false, types: [] },
              { name: 'offset', positional: false, description: '...', required: false, types: [] },
            ],
          },
        ]),
      filters: () => Promise.resolve([]),
      objects: () => Promise.resolve([]),
      liquidDrops: () => Promise.resolve([]),
      systemTranslations: () => Promise.resolve({}),
    },
  });
}
