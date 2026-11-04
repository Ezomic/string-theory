import { configFromEnv, createApp } from './index.ts'

const config = configFromEnv(process.env)
if (!config) console.warn('ID sign-in is not configured; the app switcher stays hidden.')

const port = Number(process.env.PORT ?? 5184)
createApp(config).listen(port, '127.0.0.1', () => console.log(`string-theory portal backend on 127.0.0.1:${port}`))
