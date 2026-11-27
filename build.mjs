import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const tscArgs = ['npx', 'tsc', '--noEmit', ...(isWatch ? ['--watch', '--preserveWatchOutput'] : [])];
const tsc = spawn(tscArgs.join(' '), { shell: true, stdio: 'inherit' });
const buildOptions = {
    entryPoints: ['src/breathe_rhythm_engine.ts', 'src/ui/index.ts'],
    bundle: true,
    splitting: true,
    minify: !isWatch,
    sourcemap: true,
    format: 'esm',
    target: 'es2022',
    outdir: 'src',
};
const clean = () => {
    for (const file of readdirSync('src', { recursive: true })) {
        if (/\.js(\.map)?$/.test(file)) {
            rmSync(join('src', file), { force: true });
        }
    }
}

if (!isWatch) {
    const code = await new Promise(resolve => tsc.on('close', resolve));
    if (code !== 0) process.exit(code ?? 1);
}

clean();

if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
} else {
    await esbuild.build(buildOptions);
}
