const fs = require('fs')
const path = require('path')

const POINTER_HEADER = 'version https://git-lfs.github.com/spec/v1'

const criticalFiles = [
  'external/scripts/8frame-1.5.0.min.js',
  'external/xr/xr.js',
  'external/xrextras/xrextras.js',
  'external/xrextras/resources/aframe/stats.16.min.js',
]

const root = process.cwd()
const pointerFiles = []

criticalFiles.forEach((relativePath) => {
  const absolutePath = path.join(root, relativePath)

  if (!fs.existsSync(absolutePath)) {
    return
  }

  const content = fs.readFileSync(absolutePath, 'utf8')
  if (content.startsWith(POINTER_HEADER)) {
    pointerFiles.push(relativePath)
  }
})

if (pointerFiles.length > 0) {
  console.error('Build blocked: unresolved Git LFS pointer files detected:')
  pointerFiles.forEach(file => console.error(` - ${file}`))
  console.error('Enable Git LFS for this deployment source or commit non-LFS assets for these files.')
  process.exit(1)
}
