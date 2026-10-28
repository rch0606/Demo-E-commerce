/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)

// Ajout spécifique au projet (à conserver si Payload régénère ce fichier) : Payload ne gère pas
// HEAD et répondait 404 sur les images, ce qui trompe certains robots (Google,
// aperçus de liens). On rejoue la requête en GET et on ne renvoie que les en-têtes.
export const HEAD = async (request: Request, context: { params: Promise<{ slug: string[] }> }) => {
  const response = await GET(new Request(request.url, { method: 'GET', headers: request.headers }), context)
  await response.body?.cancel()
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers })
}
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)

export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
