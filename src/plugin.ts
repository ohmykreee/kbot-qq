import { msg_types, msg_response_types, plugin_types } from "./types.js"
import { makeResponse } from "./app.js"
import fs from 'fs/promises'
import { log } from "./logger.js"
import path from 'path'

// 定义一个插件管理器并初始化
class PluginManagerClass {
  private _plugins: plugin_types[] = []

  load(path: string): Promise<void> {
    return new Promise(async (resolve) => {
      const { default: plugin } = await import(path)
      plugin.start()
      this._plugins.push(plugin)
      log.info(`PluginManager: load: ${plugin.name}, version: ${plugin.version}`)
      resolve()
    })
  }

  unloadAll() :Promise<void> {
    return new Promise(async (resolve) => {
      for (let plugin of this._plugins) {
        await plugin.stop()
      }
      this._plugins.splice(0, this._plugins.length)
      log.info(`PluginManager: unload all...`)
      resolve()
    })
  }

  pushMsg(msg :msg_types) :void {
    for (let plugin of this._plugins) {
      plugin.receiver(msg)
        .then((msg_send) => {
          // 判断是否传入消息（因为可返回 void）
          if (msg_send) {
            pluginSendMsg(msg_send)
          }
        })
    }
  }
}
const PluginManager = new PluginManagerClass()

/**
 * 载入所有的插件
 * 
 */
export async function pluginsLoad() :Promise<void> {
  const mainDir :string = path.resolve()
  const pluginList = await fs.readdir(`${mainDir}/plugins`, { withFileTypes: true })
  pluginList
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
  for (let plugin of pluginList) {
    // 判断是否存在 app.js/app.ts
    const pluginFiles = await fs.readdir(`${mainDir}/plugins/${plugin.name}`)
    if (pluginFiles.includes("app.js") || pluginFiles.includes("app.ts")) {
      await PluginManager.load(`file:///${mainDir}/plugins/${plugin.name}/app.js`)
    } else {
      log.warn(`PluginManager: load: Invalid plugin folder: ${plugin.name}`)
    }
  }
}


/**
 * 卸载所有的插件
 * 
 */
export function pluginsUnload(exitCode? :number) :Promise<void>{
  return new Promise(async (resolve) => {
    await PluginManager.unloadAll()
    resolve()
  })
}

/**
 * 从 app.ts 的 fetchResponse() 处获取消息
 * 
 */
export function pluginReceiveMsg(msg :msg_types) :void {
  PluginManager.pushMsg(msg)
}

/**
 * 发送消息到 app.ts 的 makeResponse()
 * 
 */
export function pluginSendMsg(msg :msg_types) :void {
  const msg_response :msg_response_types= {
    text: msg.raw_text,
    message_type: msg.message_type,
    user_id: msg.user_id,
    group_id: msg.group_id? msg.group_id:undefined
  }
  makeResponse(msg_response)
}