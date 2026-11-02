import * as THREE from 'three'

/* Mediu procedural FARA panouri dreptunghiulare si FARA lumini punctiforme.
   Surse de lumina curbate / difuze:
   - 2 arce de tor albe, inclinate diferit -> dare lungi curbate care
     urmaresc suprafata (nu dreptunghiuri, nu puncte);
   - 1 arc cyan pe conturul stang, 1 arc magenta pe conturul drept;
   - 1 bolta difuza inchisa (sfera BackSide) ca umplutura de baza,
     plus o tenta violeta jos pentru adancime.
   Totul e copt o singura data prin PMREM. */

function arcTor(raza, tub, arc, culoare, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(raza, tub, 16, 72, arc),
    new THREE.MeshBasicMaterial({ color: culoare, side: THREE.DoubleSide }),
  )
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  return m
}

export function creeazaMediu(renderer) {
  const scena = new THREE.Scene()
  scena.background = new THREE.Color(0x04060c)
  const alb = (v) => new THREE.Color(v, v, v)
  // Cheie: arc alb lung, inclinat -> dara curbata dominanta.
  scena.add(arcTor(5.0, 0.18, 3.6, alb(6.0), -1.5, 1.0, 0, 0.35, 0.25, 0.55))
  // Secundar: arc alb mai ingust, inclinat opus.
  scena.add(arcTor(5.5, 0.15, 2.6, alb(5.0), 2.0, -0.5, -1, -0.3, -0.2, -0.6))
  // Accente pe contur: cyan stanga, magenta dreapta.
  scena.add(arcTor(5.2, 0.16, 2.4, new THREE.Color(0.35, 2.4, 2.9), -2.5, 0.5, -2.5, 0.1, 0.5, 0.35))
  scena.add(arcTor(5.2, 0.16, 2.4, new THREE.Color(2.9, 0.35, 2.3), 2.5, -0.5, -2.5, -0.1, -0.5, -0.35))
  // Bolta difuza inchisa (umplutura de baza, fara pete dure).
  const bolta = new THREE.Mesh(
    new THREE.SphereGeometry(22, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.08, 0.22), side: THREE.BackSide }),
  )
  scena.add(bolta)
  // Tenta violeta de jos.
  scena.add(arcTor(6.0, 0.5, 2.0, new THREE.Color(0.7, 0.22, 2.0), 0, -4.5, 1, 0.2, 0, 0))
  const pmrem = new THREE.PMREMGenerator(renderer)
  const textura = pmrem.fromScene(scena, 0.12).texture
  pmrem.dispose()
  return textura
}

export function creeazaLumini(scena) {
  // Cheie moale + umplutura rece. Fara puncte (punctele fac dare rotunde).
  const cheie = new THREE.DirectionalLight(0xffffff, 1.1)
  cheie.position.set(2.5, 3.5, 4)
  scena.add(cheie)

  const umplutura = new THREE.DirectionalLight(0x8fb4ff, 0.45)
  umplutura.position.set(-3, 0.5, 5)
  scena.add(umplutura)

  scena.add(new THREE.AmbientLight(0x334488, 0.4))
}
