import { build } from 'esbuild'
import { argv } from 'node:process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const directory = resolve(argv[2] ?? 'supabase/dashboard')
await mkdir(directory, { recursive: true })
for (const name of ['match-opportunities', 'extract-opportunity', 'generate-roadmap']) {
  const { outputFiles } = await build({
    entryPoints: ['supabase/functions/' + name + '/index.ts'],
    bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', write: false,
    packages: 'bundle', treeShaking: true,
  })
  await writeFile(resolve(directory, name + '.ts'), '// Generado por npm run build:edge. Pegar como index.ts en Supabase Dashboard.\n// @ts-nocheck\n' + outputFiles[0].text)
}
