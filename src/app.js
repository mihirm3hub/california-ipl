// Copyright (c) 2022 8th Wall, Inc.
//
// app.js is the main entry point for your 8th Wall app. Code here will execute after head.html
// is loaded, and before body.html is loaded.

import './index.css'
import './main'

AFRAME.registerComponent('no-cull', {
    init() {
        this.el.addEventListener('model-loaded', () => {
            this.el.object3D.traverse(obj => obj.frustumCulled = false)
        })
    },
})
// Register custom A-Frame components in app.js before the scene in body.html has loaded.
import { entitySpawnerComponent } from './entity-spawner'
AFRAME.registerComponent('entity-spawner', entitySpawnerComponent)

import { chromaKeyShader } from './chroma-key'
AFRAME.registerShader('chromakey', chromaKeyShader)

import { playVideoComponent } from './play-video'
AFRAME.registerComponent('play-video', playVideoComponent)

let hasStartedLoaderSequence = false

const hideLoadingScreen = () => {
    if (hasStartedLoaderSequence) {
        return
    }

    const loader = document.getElementById("loaderScreen");
    const loaderSurface = loader?.querySelector(".loader-screen");
    const loaderText = document.getElementById("loaderText");
    if (!loader) {
        return
    }

    hasStartedLoaderSequence = true

    if (loader && loaderText) {
        const texts = ["Uploading prizes...", "Downloading almonds...", "Activating health benefits...", "Loading superfood..."];

        function changeText(i) {
            // remove class
            loaderText.classList.remove("loader-text-change");

            // 🔥 HARD RESET (important)
            loaderText.style.animation = "none";

            // force reflow
            loaderText.offsetHeight;

            // set text
            loaderText.textContent = texts[i];

            // reapply animation
            loaderText.style.animation = "";
            loaderText.classList.add("loader-text-change");
        }

        // 🔥 FIRST TEXT ANIMATION (missing before)
        changeText(0);

        // 🔥 PERFECTLY MATCHED WITH CSS KEYFRAMES (3.5s total)
        setTimeout(() => changeText(1), 1050); // ~30%
        setTimeout(() => changeText(2), 2100); // ~60%
        setTimeout(() => changeText(3), 3000); // ~85%

    }
    // HIDE
    setTimeout(() => {
        if (loaderSurface) {
            loaderSurface.classList.add("loader-hide");
        }

        setTimeout(() => {
            loader.style.display = "none";
        }, 700);
    }, 4200);
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
