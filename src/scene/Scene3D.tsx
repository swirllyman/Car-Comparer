import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { ResolvedCar } from '../data/types'
import { beltHeight, clipY, MIRROR_DEPTH, mirrorY, sideProfile, topMirrors, wheelRadius, type Pt } from '../geometry/shapes'

/** Scene units are metres; the data is millimetres. */
const M = 1 / 1000

/**
 * Extrude a side-view polygon across the car, then scale the result so its
 * bounding box is exactly the polygon's own extent × `width` (bevels would
 * otherwise add a few centimetres). The shape is approximate; the size is not.
 */
function extrudeExact(pts: Pt[], width: number, bevelFrac: number) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
  const bevel = width * bevelFrac
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.6,
    bevelSegments: 5,
    curveSegments: 4,
  })
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const size = bb.getSize(new THREE.Vector3())
  geo.translate(-bb.min.x, -bb.min.y, -bb.min.z)
  geo.scale((x1 - x0) / size.x, (y1 - y0) / size.y, width / size.z)
  geo.translate(x0, y0, -width / 2)
  geo.scale(M, M, M)
  geo.computeVertexNormals()
  return geo
}

/** Lower body at full width; the cabin above the belt line tucks in, as real cars do. */
function useBody(car: ResolvedCar) {
  return useMemo(() => {
    const profile = sideProfile(car)
    const belt = beltHeight(car)
    return {
      lower: extrudeExact(clipY(profile, belt, 'below'), car.widthBody, 0.07),
      cabin: extrudeExact(clipY(profile, belt, 'above'), car.widthBody * 0.9, 0.1),
    }
  }, [car])
}

function Car3D({ car, x, ghost }: { car: ResolvedCar; x: number; ghost?: boolean }) {
  const { lower, cabin } = useBody(car)
  const r = wheelRadius(car)
  const tireW = 240
  const wheelZ = car.widthBody / 2 - 25 - tireW / 2
  const mirrorHeight = beltHeight(car) - 40
  const material = ghost ? (
    <meshStandardMaterial color="#f08a24" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
  ) : (
    <meshStandardMaterial color="#8a97a8" metalness={0.3} roughness={0.45} />
  )
  return (
    <group position={[x * M, 0, 0]}>
      <mesh geometry={lower}>
        {material}
        {ghost && <Edges threshold={20} color="#d06a00" />}
      </mesh>
      <mesh geometry={cabin}>
        {ghost ? material : <meshStandardMaterial color="#2c3642" metalness={0.5} roughness={0.15} />}
        {ghost && <Edges threshold={20} color="#d06a00" />}
      </mesh>
      {[car.frontOverhang, car.frontOverhang + car.wheelbase].flatMap((wx) =>
        [-wheelZ, wheelZ].map((wz) => (
          <mesh key={`${wx}-${wz}`} position={[wx * M, r * M, wz * M]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * M, r * M, tireW * M, 28]} />
            {ghost ? (
              <meshStandardMaterial color="#f08a24" transparent opacity={0.2} depthWrite={false} />
            ) : (
              <meshStandardMaterial color="#1e2227" roughness={0.9} />
            )}
          </mesh>
        )),
      )}
      {topMirrors(car).map((m, i) => (
        <mesh key={i} position={[(mirrorY(car) + MIRROR_DEPTH / 2) * M, (mirrorHeight + 75) * M, (m.x + m.w / 2) * M]}>
          <boxGeometry args={[MIRROR_DEPTH * M, 150 * M, m.w * M]} />
          {material}
        </mesh>
      ))}
    </group>
  )
}

export default function Scene3D({ current, candidate, candidateX }: { current: ResolvedCar; candidate: ResolvedCar; candidateX: number }) {
  const len = Math.max(current.length, candidate.length) * M
  const mid = (Math.min(0, candidateX) * M + Math.max(current.length, candidateX + candidate.length) * M) / 2
  return (
    <Canvas className="scene3d" camera={{ position: [mid - len * 0.9, len * 0.55, len * 0.95], fov: 35 }} dpr={[1, 2]}>
      <color attach="background" args={['#eef1f5']} />
      <hemisphereLight args={['#ffffff', '#b8c0cc', 1.4]} />
      <directionalLight position={[-3, 6, 4]} intensity={1.6} />
      {/* One-foot squares on the floor. */}
      <gridHelper args={[0.3048 * 40, 40, '#aab3c0', '#d3d9e1']} position={[mid, 0, 0]} />
      <Car3D car={current} x={0} />
      <Car3D car={candidate} x={candidateX} ghost />
      <OrbitControls target={[mid, 0.7, 0]} maxPolarAngle={Math.PI / 2 - 0.02} enableDamping />
    </Canvas>
  )
}
