import type { ApplicationService } from '@adonisjs/core/types'
import emitter from '@adonisjs/core/services/emitter'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger'
import { competitionRealtimeHub } from '#services/competition_realtime_hub'
import { registerRealtimeModelHooks } from '#services/realtime_model_hooks'

export default class RealtimeProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    emitter.on('http:server_ready', () => {
      const httpServer = server.getNodeServer()
      if (!httpServer) {
        logger.warn('Realtime provider: žiadny Node HTTP server, WebSocket nie je dostupný')
        return
      }
      registerRealtimeModelHooks()
      competitionRealtimeHub.attach(httpServer)
    })
  }
}
