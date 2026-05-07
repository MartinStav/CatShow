import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

const allowlist = (env.get('CORS_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

/** CORS politika — v deve všetky origins, v prode allowlist z CORS_ORIGINS. */
const corsConfig = defineConfig({
  enabled: true,
  origin: app.inDev ? true : allowlist,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
