import { msg_types, msg_response_types, plugin_types, plugin_info_types, plugin_ipc } from "./types.js"
import { makeResponse } from "./app.js"
import fs from 'fs/promises'
import { log } from "./logger.js"
import path from 'path'
import child_process from 'child_process'

class PluginClass implements plugin_types {
  constructor(path :string) {
    this._childProcess = child_process.spawn(process.execPath, ['app.js'], { cwd: path, stdio: [ 'pipe', 'inherit', 'inherit', 'ipc' ] })
    this._register()

    this._path = path
    this.stop = this.stop
    this.receiver = this.receiver
  }

  private _path: string
  private _childProcess :child_process.ChildProcess
  name :string | undefined
  version :string | undefined

  // 注册一些事件
  private _register() {
    this._childProcess.on("message", (data: plugin_ipc) => {this._msgHandler(data)})
    this._childProcess.once("close", () => { this._errHandler() })
  }

  private _msgHandler(data: plugin_ipc) {
    if (data.type === "message") {
      const msg_send = data.data as msg_response_types
      pluginSendMsg(msg_send)
    } else {
      const pluginMetadata = data.data as plugin_info_types
      log.info(`Plugin: load: ${pluginMetadata.name}, version: ${pluginMetadata.version}`)
      this.name = pluginMetadata.name
      this.version = pluginMetadata.version
    }
  }

  private _errHandler() {
    log.error(`Plugin: ${this.name} quit, version: ${this.version}. Will restart after 3s!`)
    setTimeout(() => {
      this._childProcess = child_process.spawn(process.execPath, ['app.js'], { cwd: this._path, stdio: [ 'pipe', 'inherit', 'inherit', 'ipc' ] })
      this._register()
    }, 3000)
  }

  stop() :Promise<void> {
    return new Promise((resolve) => {
      this._childProcess.removeAllListeners("close")
      this._childProcess.once("close", () => {
        resolve()
      })
      this._childProcess.send(0) // 如果想要停止插件，可以选择直接传入非 object（推荐纯数字）
    })
  }

  receiver(msg: msg_types): void {
    if (this._childProcess.channel) {
      this._childProcess.send(msg)
    }
  }
}

// 定义一个插件管理器并初始化
class PluginManagerClass {
  private _plugins: plugin_types[] = []

  load(path: string): Promise<void> {
    return new Promise(async (resolve) => {
      const plugin = new PluginClass(path)
      this._plugins.push(plugin)
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
  for (const plugin of pluginList) {
    // 判断是否存在 app.js
    const pluginFiles = await fs.readdir(`${mainDir}/plugins/${plugin.name}`)
    if (pluginFiles.includes("app.js")) {
      await PluginManager.load(`${mainDir}/plugins/${plugin.name}`)
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
export function pluginSendMsg(msg :msg_response_types) :void {
  const msg_response :msg_response_types= {
    text: msg.text,
    message_type: msg.message_type,
    user_id: msg.user_id,
    group_id: msg.group_id? msg.group_id:undefined
  }
  makeResponse(msg_response)
}