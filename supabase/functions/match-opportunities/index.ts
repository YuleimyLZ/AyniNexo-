import { createHandler } from '../_shared/handler'

declare const Deno: { env: { get: (name: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void }

Deno.serve(createHandler('match', (name) => Deno.env.get(name)))
