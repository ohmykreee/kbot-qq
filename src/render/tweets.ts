import nodeHtmlToImage from 'node-html-to-image'
import { uploadToGokapi } from '../utils.js'
import { randomBytes } from "crypto"
import { JSDOM } from "jsdom"
import { log } from "../logger.js"

// 输出用的 HTML 字符串
const getHTML = (dom: JSDOM): string => {
  const item = dom.window.document.getElementsByTagName("item")[0]
  const publisher: string[] = dom.window.document.getElementsByTagName('title')[0].innerHTML.split(" / ")
  const info = {
    user: {
      nickname: publisher[0],
      username: publisher[1],
      avatar: dom.window.document.getElementsByTagName("url").item(0)!.innerHTML
    },
    tweets: {
      time: `${new Date(Date.parse(item.getElementsByTagName('pubDate')[0].innerHTML)).toLocaleString('zh-CN')} UTC+8`,
      retweet: (item.getElementsByTagName('title')[0].innerHTML.indexOf("RT by") === 0)? item.getElementsByTagName('dc:creator').item(0)!.innerHTML:undefined,
      content: item.getElementsByTagName("description").item(0)!.innerHTML.replace("<![CDATA[", "").replace("]]>", "").replaceAll("style=", "")
    }
  }
  return(`
<!DOCTYPE html>
<html>
  <head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Noto+Color+Emoji&family=Noto+Sans+HK:wght@500&family=Noto+Sans+JP:wght@500&family=Noto+Sans+KR:wght@500&family=Noto+Sans+SC:wght@500&family=Noto+Sans+TC:wght@500&display=swap" rel="stylesheet">

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 600px;
      padding: 0.5rem;
      background-color: transparent;
    }
    a {
      color: #000;
    }
    .container {
      font-family: 'Noto Sans SC', 'Noto Color Emoji', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans TC', 'Noto Sans HK', sans-serif;
      background-color: #ffff;
      font-size: 1rem;
      line-height: 1.5rem;
      display: flex;
      flex-direction: column;
      border-radius: 0.25rem;
      outline-style: solid;
      outline-width: 0.75px;
      outline-color: #075a97;
    }
    .main {
      flex-grow: 1;
      margin: 1rem 2rem;
    }
    .info {
      margin: 1rem 0;
      display: flex;
      flex-direction: row;
    }
    .info img {
      margin: 0.5rem 1rem;
      height: 5rem;
      border-radius: 10rem;
      flex-shrink: 0;
      border: #000;
      border-style: solid;
      border-width: 2px;
    }
    .info div {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex-grow: 1;
    }
    .info .name {
      font-size: 1.25rem;
      line-height: 1.75rem;
    }
    .info svg {
      margin: 0 1rem;
      height: 2rem;
      align-self: center;
    }
    .tweets {
      margin: 1rem 0;
    }
    .tweets img {
      width: 100%;
      margin: 0.5rem 0;
    }
    .footer {
      font-family: 'Comfortaa', cursive;
      color: #ffff;
      background-color: #0a79cb;
      flex-shrink: 0;
      display: flex;
      flex-direction: row;
      padding: 0.25rem 0.5rem;
      border-radius: 0 0 0.25rem 0.25rem;
    }
    .footer p {
      flex-grow: 1;
    }
    .footer svg {
      height: 1.5rem;
      width: auto;
      flex-shrink: 0;
    }
    .grey {
      color: #a5a5a5;
      font-size: 0.875rem;
    }

  </style>

  </head>

  <body>

    <div class="container">
      <div class="main">
        <div class="info">
          <img src="${info.user.avatar}">
          <div>
            <p class="name">${info.user.nickname}</p>
            <p class="grey">${info.user.username}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path fill="#2299ee" d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"/></svg>
        </div>
        <div class="tweets">
          ${info.tweets.retweet? `<p class="grey">（转推自：${info.tweets.retweet}）</p>`:""}
          ${info.tweets.content}
        </div>
        <p class="grey">发布时间：${info.tweets.time}</p>
      </div>
      <div class="footer">
        <p>powered by K-bot & Nitter</p>
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="1085.000000pt" height="1280.000000pt" viewBox="0 0 1085.000000 1280.000000" preserveAspectRatio="xMidYMid meet">
          <metadata>
            Created by potrace 1.15, written by Peter Selinger 2001-2017
          </metadata>
          <g transform="translate(0.000000,1280.000000) scale(0.100000,-0.100000)" fill="#ffff" stroke="none">
          <path d="M4016 12755 c4 -16 107 -408 230 -870 l222 -840 -28 -40 c-66 -96
          -136 -273 -159 -402 -6 -32 -15 -116 -20 -188 -8 -115 -6 -148 15 -290 84
          -567 210 -1001 421 -1448 35 -76 62 -141 59 -144 -8 -9 43 -97 144 -248 245
          -364 526 -654 805 -830 309 -194 586 -255 824 -180 634 200 710 1343 166 2473
          -348 722 -863 1279 -1365 1476 -158 62 -369 159 -384 175 -8 9 -218 320 -466
          691 -249 371 -457 680 -462 685 -6 6 -7 -1 -2 -20z"/>
          <path d="M1452 11660 c3 -8 22 -67 42 -130 21 -63 114 -349 208 -635 93 -286
          192 -587 218 -670 l49 -150 -43 -170 c-24 -93 -53 -201 -65 -240 -45 -149 -55
          -236 -55 -490 0 -254 10 -350 60 -580 101 -469 310 -952 594 -1375 496 -741
          1164 -1150 1624 -996 269 91 436 332 508 736 17 98 17 492 -1 620 -28 209 -91
          470 -161 673 -49 142 -77 207 -95 221 -8 6 -37 63 -65 125 -60 136 -125 260
          -228 433 -155 260 -314 461 -567 714 -148 148 -215 207 -305 269 -130 89 -268
          157 -385 190 -85 25 -257 50 -279 42 -7 -3 -52 26 -99 64 l-86 69 -427 637
          c-235 351 -431 643 -437 648 -7 7 -8 5 -5 -5z"/>
          <path d="M7980 11278 c-19 -5 -36 -11 -38 -12 -1 -2 32 -54 73 -116 210 -314
          376 -773 429 -1185 22 -164 21 -175 -7 -175 -57 0 -189 -59 -272 -120 -300
          -223 -510 -680 -587 -1280 -19 -154 -16 -609 5 -773 113 -852 502 -1472 967
          -1539 495 -73 931 517 1035 1399 20 171 20 575 0 746 -41 347 -122 636 -256
          916 -57 120 -69 153 -69 195 0 70 -25 217 -60 356 -144 568 -528 1215 -880
          1477 -118 89 -260 135 -340 111z"/>
          <path d="M123 7451 c-69 -43 -110 -155 -120 -326 -27 -514 373 -1415 819
          -1840 87 -84 99 -99 147 -200 133 -279 298 -504 560 -765 256 -255 536 -458
          836 -605 603 -297 1141 -309 1415 -33 152 153 208 406 150 687 -103 509 -527
          1080 -1115 1503 -356 256 -758 423 -1125 468 -256 31 -483 -19 -649 -142 l-53
          -40 -75 73 c-164 161 -351 399 -472 601 -111 186 -271 553 -271 622 0 21 -8
          20 -47 -3z"/>
          <path d="M6120 6183 c-319 -23 -648 -174 -877 -402 -158 -157 -257 -310 -292
          -452 -65 -263 -88 -550 -72 -894 24 -498 24 -495 7 -592 -36 -207 -140 -454
          -262 -623 -33 -46 -96 -114 -152 -162 -162 -142 -334 -343 -465 -543 -196
          -302 -257 -487 -272 -830 -16 -340 82 -674 286 -981 98 -146 294 -344 435
          -437 175 -116 382 -202 589 -244 73 -15 132 -18 315 -16 452 3 586 53 865 324
          164 159 226 238 365 462 58 92 146 223 197 292 103 137 285 331 402 429 227
          189 510 327 821 400 222 53 311 61 655 61 288 -1 343 -3 555 -29 181 -22 257
          -27 332 -22 321 20 578 145 844 410 95 95 150 160 199 234 351 539 338 1227
          -36 1788 -83 124 -280 329 -391 408 -165 116 -335 196 -518 245 -209 55 -241
          56 -505 10 -286 -50 -385 -59 -551 -48 -265 17 -530 108 -744 255 -46 31 -252
          211 -459 400 -373 342 -375 344 -485 398 -180 89 -348 137 -546 155 -112 11
          -145 11 -240 4z"/>
          </g>
        </svg>
      </div>
    </div>

  </body>
</html>
`)

}


/**
 * 渲染推文格式的图片
 *
 *
 * @param dom - 需要渲染的内容，处理过的 Nitter RSS DOM 元素。
 * 
 * @returns Promise<string>，返回值为结果图片的 Gokapi 的直链
 * 
 */
export function renderTweets(dom: JSDOM): Promise<string> {
  return new Promise((resolve) => {
    nodeHtmlToImage({
      html: getHTML(dom),
      type: "png",
      encoding: "binary",
      transparent: true
    })
      .then(async (buffer) => {
        uploadToGokapi(buffer as Buffer, `kbot-reply-tweets-${randomBytes(5).toString('hex')}.png`, 1, 0)
          .then((res) => {
            if (res.hotlinkUrl) {
              resolve(res.hotlinkUrl)
            } else {
              log.error(`ERROR: renderTweets: empty hotlinkUrl from Gokapi!`)
            }
          })
      })
      .catch((error) => {
        log.error(`ERROR: renderTweets: ${error.toString()}`)
      })
  })
}