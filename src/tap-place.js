// Component that places cacti where the ground is clicked

export const tapPlaceComponent = {
  schema: {
    min: {default: 6},
    max: {default: 10},
  },
  init() {
    this.prompt = document.getElementById('promptText')
    this.camera = document.getElementById('camera')

    if (this.prompt) {
      this.prompt.textContent = 'Spawning cacti every 5s'
    }

    this.spawnIntervalId = setInterval(() => {
      this.spawnCactusAroundUser()
    }, 5000)
  },
  remove() {
    if (this.spawnIntervalId) {
      clearInterval(this.spawnIntervalId)
      this.spawnIntervalId = null
    }
  },
  spawnCactusAroundUser() {
    if (!this.camera) {
      return
    }

    const cameraPosition = this.camera.object3D.position
    const radius = 50
    const randomAngle = Math.random() * Math.PI * 2
    const randomDistance = Math.sqrt(Math.random()) * radius
    const spawnX = cameraPosition.x + Math.cos(randomAngle) * randomDistance
    const spawnZ = cameraPosition.z + Math.sin(randomAngle) * randomDistance

    const newElement = document.createElement('a-entity')
    newElement.setAttribute('position', `${spawnX} 0.01 ${spawnZ}`)

    const randomYRotation = Math.random() * 360
    newElement.setAttribute('rotation', `0 ${randomYRotation} 0`)

    const randomScale = Math.floor(Math.random() * (Math.floor(this.data.max) - Math.ceil(this.data.min)) + Math.ceil(this.data.min))

    newElement.setAttribute('visible', 'false')
    newElement.setAttribute('scale', '0.0001 0.0001 0.0001')

    newElement.setAttribute('shadow', {
      receive: false,
    })

    newElement.setAttribute('gltf-model', '#cactusModel')
    this.el.sceneEl.appendChild(newElement)

    newElement.addEventListener('model-loaded', () => {
      // Once the model is loaded, we are ready to show it popping in using an animation.
      newElement.setAttribute('visible', 'true')
      newElement.setAttribute('animation', {
        property: 'scale',
        to: `${randomScale} ${randomScale} ${randomScale}`,
        easing: 'easeOutElastic',
        dur: 800,
      })
    })
  },
}
