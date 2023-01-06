import config from "../botconfig.js"
import fs from 'fs/promises'
import { log } from "./logger.js"
import { Low, JSONFile } from 'lowdb'

interface dbManager_types {
  init() :Promise<void>
  unload() :Promise<void>
  read(db :"osu" | "food" | "vw50") :Promise<string[]>
  push(db :"osu" | "food" | "vw50", data :string) :Promise<void>
  rm(db :"osu" | "food" | "vw50", data :string) :Promise<void>
}

class DbManagerClass implements dbManager_types {
  constructor() {
    this.init = this.init
    this.unload = this.unload
    this.read = this.read
    this.push = this.push
    this.rm = this.rm
  }

  // 按照加载顺序，该array中的数据库分别为：osu, food, vw50
  private _db :Low<any>[] = []

  private _dbList :string[] = ["osu.json", "food.json", "vw50.json"]

  private _needWrite :boolean = false

  /**
 * 初始化数据库
 *
 * @returns Promise<void>
 * 
 */
  init(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      log.info("dbInit: loading db...")
      // 检查数据库文件夹是否存在
      if (!(await fs.stat(config.dbCWD)).isDirectory()) {
        reject("dbInit: db folder defined in botconfig.dbCWD is not found!")
      }

      // 读取数据库文件夹下所有内容
      const dbFiles = await fs.readdir(config.dbCWD)

      // 分别检查各个数据库并初始化
      for(const file of this._dbList) {
        // 检查数据库文件是否存在，否则新建
        if (!dbFiles.includes(file)) {
          await fs.writeFile(`${config.dbCWD}/${file}`, "[]")
        }
        const db = new Low(new JSONFile<string[]>(`${config.dbCWD}/${file}`))
        await db.read()
        db.data ||= [] // 如果文件为空赋予一个初始结构
        this._db.push(db)
      }
      resolve()
    })
  }

  /**
 * 卸载数据库，保存所有未更改内容
 *
 * @returns Promise<void>
 * 
 */
  unload(): Promise<void> {
    return new Promise(async (resolve) => {
      log.info("dbUnload: write all changes to db...")
      for (const db of this._db) {
        await db.write()
      }
      resolve()
    })
  }

  /**
 * 读取指定数据库
 *
 * @param db - 数据库的名称
 * 
 * @returns Promise<string[]>，返回值为对应数据库的整个内容
 * 
 */
  read(db: "osu" | "food" | "vw50"): Promise<string[]> {
    return new Promise((resolve) => {
      switch(db) {
        case "osu":
          resolve(this._db[0].data)
          break

        case "food":
          resolve(this._db[1].data)
          break

        case "vw50":
          resolve(this._db[2].data)
          break
      }
    })
  }

  /**
 * 向指定数据库中添加项目
 *
 * @param db - 数据库的名称
 * @param data - 需要添加的值
 * 
 * @returns Promise<void>
 * 
 */
  push(db: "osu" | "food" | "vw50", data: string): Promise<void> {
    return new Promise(async (resolve) => {
      switch(db) {
        case "osu":
          this._db[0].data.push(data)
          this._needWrite = true
          resolve()
          break

        case "food":
          this._db[1].data.push(data)
          this._needWrite = true
          resolve()
          break

        case "vw50":
          this._db[2].data.push(data)
          this._needWrite = true
          resolve()
          break
      }
    })
  }

  /**
 * 向指定数据库中删除项目
 *
 * @param db - 数据库的名称
 * @param data - 需要删除的值
 * 
 * @returns Promise<void>
 * 
 */
  rm(db: "osu" | "food" | "vw50", data: string): Promise<void> {
    return new Promise(async (resolve) => {
      switch(db) {
        case "osu":
          this._db[0].data = this._db[0].data.filter((e :string) => e !== data)
          this._needWrite = true
          resolve()
          break

        case "food":
          this._db[1].data = this._db[1].data.filter((e :string) => e !== data)
          this._needWrite = true
          resolve()
          break

        case "vw50":
          this._db[2].data = this._db[2].data.filter((e :string) => e !== data)
          this._needWrite = true
          resolve()
          break
      }
    })
  }

  /**
 * 定期写入数据库
 *
 * @private
 * 
 */
  private _writeTimer() :void {
    setTimeout(async () => {
      if (this._needWrite) {
        log.debug("dbWrite: write changes to db...")
        for (const db of this._db) {
          await db.write()
        }
        this._needWrite = false
      }
      this._writeTimer() // 重复调用自身，形成循环
    }, 5 * 60000)
  }
}

const db = new DbManagerClass()
export default db