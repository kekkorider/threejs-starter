import './style.css'
import './editor/editor.css'
import { GameEditor } from './editor/editor'
import { bootScene, starter } from './webgl'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app')

const editor = new GameEditor()
editor.mount(app)

bootScene(editor.viewport).then(() => {
  editor.attach(starter)
}).catch((error: unknown) => {
  editor.failBoot(error)
})
