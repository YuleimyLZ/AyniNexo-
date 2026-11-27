import { createHandler } from '../_shared/handler'

declare const Deno: { env: { get: (name: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void }

Deno.serve(createHandler('extract', (name) => Deno.env.get(name)))
