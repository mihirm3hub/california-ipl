// Copyright (c) 2022 8th Wall, Inc.
//
// app.js is the main entry point for your 8th Wall app. Code here will execute after head.html
// is loaded, and before body.html is loaded.

import './index.css'

AFRAME.registerComponent('no-cull', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      this.el.object3D.traverse(obj => obj.frustumCulled = false)
    })
  },
})
// Register custom A-Frame components in app.js before the scene in body.html has loaded.
import { entitySwapnerComponent } from './entity-swapner'
AFRAME.registerComponent('entity-swapner', entitySwapnerComponent)

import { chromaKeyShader } from './chroma-key'
AFRAME.registerShader('chromakey', chromaKeyShader)

import { playVideoComponent } from './play-video'
AFRAME.registerComponent('play-video', playVideoComponent)

const hideLoadingScreen = () => {
    const loadingScreen = document.getElementById('loadingScreen')
    if (!loadingScreen) {
        return
    }
    setTimeout(() => {
        loadingScreen.classList.add('fade-out')
        setTimeout(() => {
            loadingScreen.classList.add('hidden')
        }, 1000)
    }, 1000)
}

window.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene')

    if (scene) {
        if (scene.hasLoaded) {
            hideLoadingScreen()
        } else {
            scene.addEventListener('loaded', hideLoadingScreen, { once: true })
        }
    }

    // Fallback so the spinner does not get stuck if scene events are delayed.
    window.addEventListener('load', hideLoadingScreen, { once: true })
})