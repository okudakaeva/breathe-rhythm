import { readdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

const RED_BOLD = '\x1b[1;91m';
const RED = '\x1b[91m';
const YELLOW = '\x1b[93m';
const RESET = '\x1b[0m';
const SRC_DIR = 'src';
const DIST_DIR = 'src';

const isWatch = process.argv.includes('--watch');
const tscArgs = ['npx', 'tsc', '--noEmit', ...(isWatch ? ['--watch', '--preserveWatchOutput'] : [])];
const tsc = spawn(tscArgs.join(' '), { shell: true, stdio: 'inherit' });

const buildOptions = {
    entryPoints: [`${ SRC_DIR }/breathe_rhythm_engine.ts`, `${ SRC_DIR }/ui/index.ts`],
    bundle: true,
    splitting: true,
    minify: !isWatch,
    legalComments: 'none',
    minifyWhitespace: true,
    sourcemap: true,
    format: 'esm',
    target: 'es2022',
    outdir: DIST_DIR,
};

const getExpectedCssTokens = () => {
    const dictSrc = readFileSync(`${ SRC_DIR }/br_dictionary.ts`, 'utf8');
    const keysBlock = dictSrc.match(/type\s+CssTokenKeys\s*=([^;]+);/)?.[1] ?? '';
    const keys = [...keysBlock.matchAll(/'([A-Z0-9_]+)'/g)]
            .map(m => m[1])
            .filter(k => k !== 'DPR');

    const tokens = new Map();
    for (const key of keys) {
        const typeMatch = dictSrc.match(new RegExp(`readonly\\s+${key}\\s*:\\s*(number|string)\\s*;`));
        tokens.set(key, typeMatch?.[1] ?? 'string');
    }
    return tokens;
};

const validateCssTokens = (css) => {
    const rootBlock = css.match(/:root\s*\{([^}]+)}/)?.[1] ?? '';
    const cssMap = new Map();

    for (const [, name, raw] of rootBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+)(?:;|$)/gi)) {
        cssMap.set(name.toUpperCase().replace(/-/g, '_'), raw.trim());
    }

    const errors = [];
    for (const [key, expectedType] of getExpectedCssTokens()) {
        const cssName = `--${ key.toLowerCase().replace(/_/g, '-') }`;
        const raw = cssMap.get(key);

        if (!raw) {
            errors.push(`Отсутствует CSS-переменная ${ YELLOW }${ cssName }${ RESET } (для brDict.${ key })`);
            continue;
        }

        if (/\$[a-z0-9_-]+/i.test(raw)) {
            errors.push(`Нераскрытая Sass-переменная в ${ YELLOW }${ cssName }${ RESET }: "${ raw }"`);
            continue;
        }

        const unquoted = raw.replace(/^['"]|['"]$/g, '').trim();
        const isNumber = /^-?\d+(\.\d+)?(px)?$/.test(unquoted);

        if (expectedType === 'number' && !isNumber) {
            errors.push(`Ожидалось число в ${ YELLOW }${ cssName }${ RESET } (brDict.${ key }: number), получено "${ raw }"`);
        } else if (expectedType === 'string' && !unquoted) {
            errors.push(`Ожидалась непустая строка в ${ YELLOW }${ cssName }${ RESET } (brDict.${ key }: string)`);
        }
    }

    return errors;
};

const compileSass = () => {
    try {
        const result = sass.compile(`${ SRC_DIR }/styles/style.scss`, {
            style: isWatch ? 'expanded' : 'compressed',
            sourceMap: true,
            sourceMapIncludeSources: true,
        });

        const errors = validateCssTokens(result.css);
        if (errors.length > 0) {
            console.error(`\n${ RED_BOLD }[Sass/CSS Validation Error]${ RESET }\n${ RED }  - ${ errors.join(`\n${ RED }  - `) }${ RESET }\n`);
            if (!isWatch) process.exit(1);
            return;
        }

        writeFileSync(`${ DIST_DIR }/style.css`, `${ result.css }\n/*# sourceMappingURL=style.css.map */`);
        writeFileSync(`${ DIST_DIR }/style.css.map`, JSON.stringify(result.sourceMap));
    } catch (err) {
        console.error(`\n${ RED_BOLD }[Sass Error]${ RESET } ${ RED }${ err.message }${ RESET }\n`);
        if (!isWatch) process.exit(1);
    }
};

const clean = () => {
    for (const file of readdirSync(DIST_DIR, { recursive: true })) {
        if (/\.js(\.map)?$/.test(file)) {
            rmSync(join(DIST_DIR, file), { force: true });
        }
    }
};

if (!isWatch) {
    const code = await new Promise(resolve => tsc.on('close', resolve));
    if (code !== 0) process.exit(code ?? 1);
}

clean();
compileSass();

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();

    watch(`${ SRC_DIR }/styles`, { recursive: true }, (_event, filename) => {
        if (filename?.endsWith('.scss')) {
            compileSass();
        }
    });
} else {
    await esbuild.build(buildOptions);
}
