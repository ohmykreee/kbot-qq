import {config} from "../botconfig"
import WebSocket from "ws"
import { msgHandler } from "./handler"
import { exit } from "process"

interface msg {
  raw_text :string,
  text? :string,
  message_type :string,
  group_id? :number,
  user_id :number
}


interface msg_response {
  message_type :string,
  text :string,
  user_id :number,
  group_id? :number
}

interface msg_params {
  message_type? :string,
  user_id :number,
  group_id? :number,
  message :string,
  auto_escape? :boolean
}

const SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		// logFilePath:'mylogfile.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
log = SimpleNodeLogger.createSimpleLogger( opts )

const client = new WebSocket(config.url + '?access_token=' + config.token)
client.addEventListener('message', function (event) {
  ifNeedResponed(JSON.parse(event.data as string))
})
client.addEventListener('error', function(event) {
  log.error(`websocket error: ${event.error}`)
})
client.addEventListener('close' ,function(event) {
  log.error(`connection closed: ${event.reason}`)
  process.exitCode = 1
})

function ifNeedResponed(data :any) :void {
  if (data.raw_message) {
    const msg :msg = {
      raw_text: data.raw_message as string,
      message_type: data.message_type as string,
      user_id: data.sender.user_id as number
    }
    if (/^[Kk]reee/g.test(msg.raw_text)) {
      msg.text = msg.raw_text.slice(6)
      log.info(`[${msg.user_id}] ${msg.text}`)
      if(msg.message_type === 'group') {
        msg.group_id = data.group_id
        fetchResponse(msg)
      } else {
        fetchResponse(msg)
      }
    }
  } else {
    handleCallback(data)
  }
}

function fetchResponse(msg: msg) :void {
  msgHandler(msg.text as string, function callback(reply) {
    const res :msg_response = {
      message_type: msg.message_type,
      text: reply,
      user_id: msg.user_id,
    }
    if(res.text === '智商有点低，听不懂捏') {
      log.warn(`mismatch text:${msg.raw_text}`)
    }
    if (res.message_type === 'group') {
      res.group_id = msg.group_id,
      res.text = res.text + `\n[CQ:at,qq=${res.user_id}]`
    }
    if (config.debug) {
      res.text = res.text + `\n(Debug mode)`
    }
    makeResponse(res)
  })
}

function makeResponse(res :msg_response) :void {
  const msg_params :msg_params = {
    message: res.text,
    user_id: res.user_id,
  }
  switch(res.message_type) {
    case 'group':
      msg_params.message_type = 'group'
      msg_params.group_id = res.group_id
      break
    case 'private':
      msg_params.message_type = 'private'
      break
    default:
       log.error(`makeResponse: message_type is out of range: ${res.message_type}`)
       exit(1)
  }
  
  const msg_send :object = {
    "action": "send_msg" as string,
    "params": msg_params as msg_params,
    "echo": `Response to ${msg_params.user_id}`
  }

  client.send(JSON.stringify(msg_send))
}

function handleCallback(data :any) :void {
  if (data.echo) {
    log.info(`callback: ${data.status}, retcode:${data.retcode}, echo:${data.echo}`)
  } else if (data.post_type == 'meta_event' && data.meta_event_type == 'lifecycle') {
    log.info(`${data.sub_type} user_id=${data.self_id}`)
  } else if (data.post_type == 'meta_event' && data.meta_event_type == 'heartbeat') {
    log.info(`heartbeat interval=${data.interval}`)
  } else {
    log.warn(`unhandled: ${JSON.stringify(data)}`);
  }
}