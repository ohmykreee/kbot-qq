import config from "../botconfig.js"
import { adminNotify, handleExit } from "./app.js"

interface LogManager_types {
  debug(text :string) :void
  info(text :string) :void
  warn(text :string) :void
  error(text :string) :void
  fatal(text :string) :void

  readLog(count :number) :Promise<string[]>
}

class LogManager implements LogManager_types {
  constructor() {
    this.debug = this.debug
    this.info = this.info
    this.warn = this.warn
    this.error = this.error
    this.fatal = this.fatal

    this.readLog = this.readLog
  }

  // 用于存储以往的日志，以后改为文件读写操作
  private _logHistory :Array<string> = []

  /**
   * 获取当前格式化后的时间字符串
   * 
   * @return 当前格式化后的时间字符串
   * @private
   * 
   */
  private _getDateString() :string {
    const dateObject = new Date()
    // 处理时区问题
    const offset = dateObject.getTimezoneOffset()
    const now :string = new Date(dateObject.getTime() - (offset*60*1000)).toISOString()
    return `[${now.slice(0, 10)} ${now.slice(11, -1)}]`
  }

  /**
   * 保存历史日志以供查询
   *
   * @remarks
   * 目前是保存在 {@link _logHistory} 数组中，并且每次执行会删除超过上限的日志
   *
   * @param logtext - 需要保存的日志字符串
   * @private
   * 
   */
  private _saveLog(logtext :string) :void {
    this._logHistory.push(logtext)
    if (this._logHistory.length > config.maxLogHistory) {
      this._logHistory.splice(0, this._logHistory.length - config.maxLogHistory)
      this.debug('logHistory trim has been triggered.')
    }
  }

  /**
   * 输出 Debug 级别的日志
   *
   * @remarks
   * 当 {@link config.debug} 为真时输出
   * 
   * @param text - 日志需要输出的字符串
   * 
   */
  debug(text :string) :void {
    if (config.debug) {
      const reply :string = `${this._getDateString()} [DEBUG]: ${text}`
      this._saveLog(reply)
      console.log(reply)
    }
  }

  /**
   * 输出 Info 级别的日志
   *
   * @param text - 日志需要输出的字符串
   * 
   */
  info(text :string) :void {
    const reply :string = `${this._getDateString()} [INFO]: ${text}`
    this._saveLog(reply)
    console.log(reply)
  }

  /**
   * 输出 Warn 级别的日志
   *
   * @param text - 日志需要输出的字符串
   * 
   */
  warn(text :string) :void {
    const reply :string = `${this._getDateString()} [WARN]: ${text}`
    this._saveLog(reply)
    console.log(reply)
  }

  /**
   * 输出 Error 级别的日志
   * 
   * @remarks
   * 输出日志同时以将退出码标记为1
   * 
   * @param text - 日志需要输出的字符串
   * 
   */
  error(text :string) :void {
    const reply :string = `${this._getDateString()} [ERROR]: ${text}`
    adminNotify(reply)
    this._saveLog(reply)
    console.log(reply)
    process.exitCode = 1
  }

    /**
   * 输出 Fatal 级别的日志
   *
   * @remarks
   * 输出日志后，延时5秒以异常代码（1）退出程序
   * 
   * @param text - 日志需要输出的字符串
   * 
   */
  fatal(text :string) :void {
    const reply :string = `${this._getDateString()} [FATAL]: ${text}`
    adminNotify(reply)
    this._saveLog(reply)
    console.log(reply)
    setTimeout(() => {
      handleExit(1)
    }, 5000)
  }

  /**
   * 获取历史日志
   *
   * @remarks
   * 返回指定数目的最近日志，若请求数目大于当前日志数目，则返回当前所有日志。若当前无日志，则返回一个空数组。
   *
   * @param count - 请求返回日志的数目
   * 
   * @returns Promise<string[]>，可能会返回 reject
   * 
   */
  readLog(count :number) :Promise<string[]> {
    return new Promise((resolve, reject) => {
      const logs :Array<string> = this._logHistory.slice(-count)
      if (logs.length > 0) {
        resolve(logs)
      } else {
        reject("Error: Can not get logs (logs.length < 0)")
      }
    })
  }
}

export const log = new LogManager()