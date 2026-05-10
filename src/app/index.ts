import { App } from './App'
import { Preloader, defaultPreloadSteps } from './Preloader'

const root = document.getElementById('app')
if (!root) throw new Error('Missing #app element')

;(async () => {
  const preloader = new Preloader()
  await preloader.run(defaultPreloadSteps())
  const app = new App(root)
  app.init().catch(console.error)
})()
