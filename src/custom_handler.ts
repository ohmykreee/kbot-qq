import {config} from "../botconfig"
import { msg , msg_response } from "./app"

const SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		// logFilePath:'mylogfile.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
log = SimpleNodeLogger.createSimpleLogger( opts )

export function msgHandler(data: msg) :msg_response {
  let reply :string
  switch (data.text) {
    case '状态':
      reply = `${config.version}(${config.debug? 'in debug mode':'in production'}) ${config.description}`
      break

    case '谁最可爱':
      reply = '我我我！'
      break

      case '色色':
      case '色图':
        const no_horny :Array<string> = ['不可以色色！','没有色色！','好孩子不可以色色！']
        reply = no_horny[Math.floor(Math.random() * no_horny.length)]
      break

    default:
      log.warn(`msgHandler: mismatch text:${data.text}`)
      reply = `智商有点低，听不懂捏`
  }
  const response :msg_response = {
    message_type: data.message_type,
    text: reply,
    user_id: data.user_id,
  }
  return response
}