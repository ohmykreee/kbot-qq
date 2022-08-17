# How to run
The entrance file is `src/app.ts`.

1. Use Node `v16.16.0` (Node v16 should be OK).

2. Install dependencies:
```
npm install
```

3. Rename `botconfig.ts.example` to `botconfig.ts` and edit it.

4. Generate executable js files:
```
npm run build
```
And the files will be in `dist`.

Or you can choose to run it with nodemon:
```
npm run server
```

5. Debug it with:
```
npm run dev
```

# FAQ
1. Chinese fonts can't be loaded.   
Please copy `src/fonts/` to `dist/src/fonts/`, then set working directory to `dist/src`.

2. Emoji rendered incorrectly in `text2img()`.   
For ubuntu user, please try: `sudo apt install ttf-ancient-fonts`   
Users with other system can refer to this issue: https://github.com/Automattic/node-canvas/issues/760