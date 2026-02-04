import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { OrbitControls } from 'three-stdlib';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { gsap } from 'gsap';
import { Meteorito } from '../../services/meteors-data.service';
import { MeteoritoService } from '../../services/meteorito.service';

@Component({
  selector: 'app-vs-trayectoria',
  standalone: true,
  templateUrl: './vs-trayectoria.component.html',
  styleUrls: ['./vs-trayectoria.component.css']
})
export class VsTrayectoriaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private meteoritoData?: Meteorito;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // Objetos principales
  meteorito!: THREE.Object3D;
  private tierra!: THREE.Mesh;
  private terreno!: THREE.Mesh;
  private modeloImpacto: THREE.Group | null = null;

  // Recursos / estado
  private textureLoader = new THREE.TextureLoader();
  private loader = new GLTFLoader();
  private animFrameId: number | null = null;

  // Variables de control
  private fuerzaImpacto = 5;
  private radioTierra = 25;
  private latitudImpacto = 6.25;   
  private longitudImpacto = -75.56; 
  private anguloEntrada = 20;
  private velocidad = 20;
  private alturaInicial = 80;

  // Elementos generados por impacto
  private crater: THREE.Mesh | null = null;
  private objetosImpacto: THREE.Object3D[] = [];
  private particulasImpacto: THREE.Points | null = null;

  animando = false;
  etapa = 'idle';
  colisionDetectada: any;
  controls: any;
  

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private meteoritoService: MeteoritoService) { }


  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Suscribirse a cambios de meteorito
    this.meteoritoService.meteorito$.subscribe(meteorito => {
      if (meteorito) {
        this.meteoritoData = meteorito;

        // Actualizamos lat/lon de impacto
        this.latitudImpacto = parseFloat(meteorito.impact_lat || meteorito.dataMB109_Lat || '0');
        this.longitudImpacto = parseFloat(meteorito.impact_lon || meteorito.dataMB109_Lon || '0');
        this.fuerzaImpacto = parseFloat(meteorito.impact_energy || meteorito.ia_energia || '100');
        this.velocidad = parseFloat(meteorito.impact_vel || meteorito.ia_velocidad || '20');
        this.velocidad = parseFloat(meteorito.impact_alt || '80');

      }
    });

    this.initEscenaEspacial();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.renderer) this.renderer.dispose();
  }

  /** 🌎 Convierte latitud/longitud a coordenadas 3D sobre la superficie de la Tierra */
  private coordenadasALocalizacion(lat: number, lon: number, radio: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radio * Math.sin(phi) * Math.cos(theta);
    const z = radio * Math.sin(phi) * Math.sin(theta);
    const y = radio * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  private initEscenaEspacial(): void {
    const canvas = this.canvasRef.nativeElement;

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 0, 250);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(80, 80, 80);
    this.scene.add(ambient, dir);

    // Tierra
    const tierraGeo = new THREE.SphereGeometry(this.radioTierra, 64, 64);
    const earthTexture = this.textureLoader.load('https://gis.humboldt.edu/Archive/GISData/2019/WGS84_Geographic/3DTextures/earthmap1k.jpg', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.x = 1; 
      this.tierra.rotation.y = Math.PI;
    });

    const bump = this.textureLoader.load('https://gis.humboldt.edu/Archive/GISData/2019/WGS84_Geographic/3DTextures/earthbump1k.jpg');
    earthTexture.flipY = false;
    bump.flipY = false;

    const tierraMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bump,
      bumpScale: 0.4,
      specular: new THREE.Color('grey'),
    });
    this.tierra = new THREE.Mesh(tierraGeo, tierraMat);
    this.scene.add(this.tierra);

    const puntoImpacto = this.coordenadasALocalizacion(this.latitudImpacto, this.longitudImpacto, this.radioTierra);

    const dirPunto = puntoImpacto.clone().normalize();

    const dirFrenteCamara = new THREE.Vector3(0, 0, -1);

    const q = new THREE.Quaternion().setFromUnitVectors(dirPunto, dirFrenteCamara);

    this.tierra.quaternion.copy(q);

    const markerGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(puntoImpacto);
    this.scene.add(marker);

    // debug log
    console.log('puntoImpacto (escena):', puntoImpacto);
    console.log('dirPunto (normalizado):', dirPunto);

    // Punto inicial 
    const inicio = puntoImpacto.clone().normalize().multiplyScalar(180);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.enabled = false; 


    // Cargar meteorito
    this.loader.load(
      'assets/modelos3d/rock.glb',
      (gltf) => {
        this.meteorito = gltf.scene;
        this.meteorito.scale.set(2, 2, 2);
        this.meteorito.position.copy(inicio);
        this.scene.add(this.meteorito);
        this.animarEntradaDesdeEspacioRealista(inicio, puntoImpacto);
      },
      undefined,
      (error) => console.error('Error al cargar el meteorito:', error)
    );
  }

  private animarEntradaDesdeEspacioRealista(inicio: THREE.Vector3, destino: THREE.Vector3): void {
    if (!this.meteorito || !this.camera || !this.tierra) return;

    this.animando = true;

    const duracion = 10;
    const reloj = new THREE.Clock();
    const tiempoInicial = reloj.getElapsedTime();

    const posInicial = inicio.clone();
    const radioTierra = (this.tierra.geometry as THREE.SphereGeometry).parameters.radius;
    const normal = destino.clone().normalize();
    const posImpacto = normal.multiplyScalar(radioTierra + 1.2);
    const escalaInicial = 20;
    const escalaFinal = 1;

    const camInicio = new THREE.Vector3(0, 250, 450);
    const camFinal = posImpacto.clone().add(new THREE.Vector3(0, 40, 100));

    const animar = () => {
      if (!this.animando) return;
      const t = Math.min((reloj.getElapsedTime() - tiempoInicial) / duracion, 1);

      this.meteorito.position.lerpVectors(posInicial, posImpacto, t);
      const escala = THREE.MathUtils.lerp(escalaInicial, escalaFinal, t);
      this.meteorito.scale.set(escala, escala, escala);

      const camPos = new THREE.Vector3().lerpVectors(camInicio, camFinal, Math.pow(t, 1.2));
      this.camera.position.copy(camPos);
      this.camera.lookAt(this.tierra.position);

      if (t > 0.8) {
        this.meteorito.traverse(obj => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.emissive = new THREE.Color(0xff6600);
            obj.material.emissiveIntensity = 3 * (t - 0.8);
          }
        });
      }

      if (t < 1) {
        requestAnimationFrame(animar);
      } else {
        this.animando = false;
        this.acercarCamaraAlImpactoRealista(posImpacto);
      }
    };
    animar();
  }

  private acercarCamaraAlImpactoRealista(destino: THREE.Vector3): void {
    const reloj = new THREE.Clock();
    const duracion = 3;
    const inicio = this.camera.position.clone();
    const fin = destino.clone().add(new THREE.Vector3(0, 10, 25));

    const animarZoom = () => {
      const t = Math.min(reloj.getElapsedTime() / duracion, 1);
      this.camera.position.lerpVectors(inicio, fin, t);
      this.camera.lookAt(destino);

      if (t > 0.8) {
        this.camera.position.x += (Math.random() - 0.5) * 0.8;
        this.camera.position.y += (Math.random() - 0.5) * 0.8;
      }

      if (t < 1) {
        requestAnimationFrame(animarZoom);
      } else {
        this.etapaImpacto();
      }
    };
    animarZoom();
  }

  private etapaImpacto(): void {
    this.etapa = 'impacto';
    gsap.to(this.camera.position, {
      x: 0, y: 80, z: 160,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => this.mostrarEscenaTerrestre()
    });
  }

  private mostrarEscenaTerrestre(): void {
    this.scene.clear();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Luz 
    const luz = new THREE.DirectionalLight(0xffffff, 1.2);
    luz.position.set(20, 50, 10);
    this.scene.add(luz);

    // Terreno 
    const terrenoGeo = new THREE.PlaneGeometry(4000, 4000, 64, 64);
    const terrenoMat = new THREE.MeshPhongMaterial({ color: 0x339933, flatShading: true });
    this.terreno = new THREE.Mesh(terrenoGeo, terrenoMat);
    this.terreno.rotation.x = -Math.PI / 2;
    this.scene.add(this.terreno);

    this.cargarModeloImpacto();  

    this.alturaInicial = 41;       
    this.velocidad = 20;            
    this.anguloEntrada = 30;        

    const escala = 8;

    const rad = THREE.MathUtils.degToRad(this.anguloEntrada);
    const inicio = new THREE.Vector3(
      -this.alturaInicial * Math.cos(rad) * escala,
      this.alturaInicial * escala,
      this.alturaInicial * Math.sin(rad) * escala
    );
    const control = new THREE.Vector3(0, this.alturaInicial * 0.5 * escala, 0);
    const destino = new THREE.Vector3(0, 0, 0);
    const curva = new THREE.QuadraticBezierCurve3(inicio, control, destino);
    const data = { t: 0 };

    this.scene.add(this.meteorito);
    this.meteorito.position.copy(inicio);

    const points = curva.getPoints(200);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff6600 });
    const trayectoria = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(trayectoria);

    const distancia = inicio.distanceTo(destino);
    const duracion = (distancia / this.velocidad) / 5;

  
    this.camera.position.set(-50, 30, 50);
    this.camera.lookAt(this.meteorito.position);

    gsap.to(data, {
      t: 1,
      duration: duracion,
      ease: "linear",
      onUpdate: () => {
        const posicionAnterior = this.meteorito.position.clone();
        const posicionNueva = curva.getPoint(data.t);

        if (this.modeloImpacto && !this.colisionDetectada) {
          const direccion = new THREE.Vector3()
            .subVectors(posicionNueva, posicionAnterior)
            .normalize();

          const distanciaPaso = posicionAnterior.distanceTo(posicionNueva);

          const raycaster = new THREE.Raycaster(posicionAnterior, direccion, 0, distanciaPaso);
          const intersecciones = raycaster.intersectObject(this.modeloImpacto, true);

          if (intersecciones.length > 0) {
            this.colisionDetectada = true;

            const puntoImpacto = intersecciones[0].point.clone();
            this.meteorito.position.copy(puntoImpacto);

            gsap.globalTimeline.getChildren().forEach(anim => anim.pause());

            this.simularImpacto();
            return;
          }
        }

        this.meteorito.position.copy(posicionNueva);
        this.meteorito.rotation.x += 0.05;
        this.meteorito.rotation.z += 0.03;

        if (data.t < 0.9) {
          const camOffset = new THREE.Vector3(-40, 25, 60);
          const camPos = posicionNueva.clone().add(camOffset);
          this.camera.position.lerp(camPos, 0.05);
          this.camera.lookAt(posicionNueva);
        }
      },
      onComplete: () => {
        if (!this.colisionDetectada) this.simularImpacto();

        gsap.to(this.camera.position, {
          x: -40,   // distancia lateral 
          y: 30,    // altura de la cámara sobre el cráter
          z: 50,   // distancia frontal
          duration: 2.5,
          ease: "power2.out",
          onUpdate: () => {
            this.camera.lookAt(0, 0, 0); 
          },
          onComplete: () => {
            if (this.controls) {
              this.controls.enabled = true;
              this.controls.target.set(0, 0, 0);
            }
          }
        });
      }


    });
  }

  private cargarModeloImpacto(): void {
    const modelo = this.obtenerModeloPorEnergia(this.fuerzaImpacto);
    if (!modelo) return;

    this.loader.load(
      modelo.url,
      (gltf) => {
        this.modeloImpacto = gltf.scene;

        // Escala según tipo de objeto
        this.modeloImpacto.scale.set(modelo.escala, modelo.escala, modelo.escala);

        // Calcular bounding box para ajustar altura
        const box = new THREE.Box3().setFromObject(this.modeloImpacto);
        const alturaModelo = box.max.y - box.min.y;

        // Ajuste individual según tipo de objeto
        switch (modelo.url) {
          case 'assets/modelos3d/house.glb':
            this.modeloImpacto.position.y = alturaModelo / 2; // base sobre terreno
            this.modeloImpacto.position.x = 0;
            this.modeloImpacto.position.z = 0;
            break;
          case 'assets/modelos3d/apartamento.glb':
            this.modeloImpacto.position.y = 0;
            this.modeloImpacto.position.x = -2;
            this.modeloImpacto.position.z = 2;
            break;
          case 'assets/modelos3d/city.glb':
            this.modeloImpacto.position.y = 1; // base sobre terreno
            this.modeloImpacto.position.x = 0;
            this.modeloImpacto.position.z = 0;
            break;
          default:
            this.modeloImpacto.position.y = alturaModelo / 2; // fallback
        }

        // Centrar en X,Z

        // Visible desde el inicio
        this.modeloImpacto.visible = true;
        this.scene.add(this.modeloImpacto);
        this.objetosImpacto.push(this.modeloImpacto);
      },
      undefined,
      (error) => console.error('Error al cargar modelo:', error)
    );
  }


  private obtenerModeloPorEnergia(energiaKT: number) {
    /*
      💥 Escala de referencia real aproximada:
        - 0.04 kt (pequeño impacto)  → explosión ~100 m → Casa (~10 m)
        - 50 kt (Tamaño Hiroshima)   → explosión ~1.28 km → Edificio (~30 m)
        - 200 kt (impacto medio)     → explosión ~2.5–3 km → Ciudad (~200 m)
      
      ⚙️ Se multiplica todo ×10 para adaptarse al tamaño de los modelos en la escena.
      Esto permite que la casa, edificio o ciudad se vean proporcionados frente a la explosión.
    */

    if (energiaKT >= 2.5) {
      return { url: 'assets/modelos3d/city.glb', escala: 0.6 };
    } else if (energiaKT >= 0.5) {
      return { url: 'assets/modelos3d/apartamento.glb', escala: 0.2 };
    } else if (energiaKT >= 0.001) {
      return { url: 'assets/modelos3d/house.glb', escala: 0.4 };
    } else {
      return null;
    }
  }



  private simularImpacto(): void {
    if (!this.meteorito) return;

    // --- parámetros  ---
    const energiaKT = Math.max(0.04, this.fuerzaImpacto || 10); // kilotones (mínimo 0.04)
    const energiaJ = energiaKT * 4.184e12; // conversión a julios


    const escalaVisual = 100; 
    const escenEscala = 1.5 * escalaVisual; 

    // --- factores  ---
    const C_fogonazo = 6;

    const raizCubica = Math.pow(energiaKT, 1 / 3);

    const radioCraterKm = 0.015 * raizCubica;   
    const radioExplosionKm = 0.35 * raizCubica; 

    const radioCraterEscena = radioCraterKm * escenEscala;
    const radioExplosionEscena = radioExplosionKm * escenEscala;

    const intensidadFogonazo = Math.max(4, C_fogonazo * Math.sqrt(energiaKT));
    const fogonazo = new THREE.PointLight(0xffee99, intensidadFogonazo * 5, (2000 + energiaKT * 50) * escalaVisual);
    fogonazo.position.copy(this.meteorito.position);
    this.scene.add(fogonazo);
    gsap.to(fogonazo, { intensity: 0, duration: 1.5, ease: "power2.out", onComplete: () => { this.scene.remove(fogonazo); } });

    const ondaGeo = new THREE.CircleGeometry(1, 64);
    const ondaMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const onda = new THREE.Mesh(ondaGeo, ondaMat);
    onda.rotation.x = -Math.PI / 2;
    onda.position.copy(this.meteorito.position);
    onda.position.y += 0.02 * escalaVisual;
    this.scene.add(onda);

    gsap.to(onda.scale, {
      x: radioExplosionEscena,
      y: radioExplosionEscena,
      z: radioExplosionEscena,
      duration: 2.2,
      ease: "power2.out",
      onComplete: () => { this.scene.remove(onda); }
    });
    gsap.to(ondaMat, { opacity: 0, duration: 2.2 });

    const count = 1000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60 * (raizCubica / 4) * escalaVisual;
      positions[i * 3 + 1] = Math.random() * 30 * (raizCubica / 4) * escalaVisual;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60 * (raizCubica / 4) * escalaVisual;
    }

    const particulasGeom = new THREE.BufferGeometry();
    particulasGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const matPart = new THREE.PointsMaterial({ color: 0xffaa00, size: 8, transparent: true }); // 🔸 size aumentado
    const sistema = new THREE.Points(particulasGeom, matPart);
    sistema.position.copy(this.meteorito.position);
    this.scene.add(sistema);
    gsap.to(matPart, { opacity: 0, duration: 3, onComplete: () => { this.scene.remove(sistema); } });

    const craterGeo = new THREE.SphereGeometry(radioCraterEscena, 64, 64);
    craterGeo.scale(1, 0.45, 1);
    craterGeo.computeVertexNormals();

    const posAttr = craterGeo.attributes['position'];
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const deform = (Math.random() - 0.5) * 0.12 * (raizCubica / 3) * escalaVisual;
      posAttr.setY(i, y + deform);
    }
    posAttr.needsUpdate = true;

    const craterMat = new THREE.MeshStandardMaterial({
      color: 0x223355,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const crater = new THREE.Mesh(craterGeo, craterMat);
    crater.position.copy(this.meteorito.position);
    crater.position.y -= radioCraterEscena * 0.28;
    this.scene.add(crater);
    this.crater = crater;
    this.objetosImpacto.push(crater);

    const esferaGeo = new THREE.SphereGeometry(radioExplosionEscena, 64, 64);
    const esferaMat = new THREE.MeshPhysicalMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.5,
      emissive: 0x66ccff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.3,
      wireframe: true
    });

    const esfera = new THREE.Mesh(esferaGeo, esferaMat);
    esfera.position.copy(this.meteorito.position);
    this.scene.add(esfera);
    this.objetosImpacto.push(esfera);

    gsap.to(esfera.material, { opacity: 0.2, duration: 2, delay: 2 });


    const luzCrater = new THREE.PointLight(0x66ccff, Math.max(0.5, raizCubica * 0.6), (400 + energiaKT * 10) * escalaVisual);
    luzCrater.position.copy(this.meteorito.position);
    luzCrater.position.y += radioCraterEscena * 0.6;
    this.scene.add(luzCrater);
    gsap.to(luzCrater, { intensity: 0.0, duration: 10, delay: 2 });

    gsap.to(this.camera.position, {
      x: "+=30",
      y: "+=20",
      duration: 0.2,
      yoyo: true,
      repeat: 4,
      ease: "power1.inOut"
    });

    this.meteorito.visible = false;
    if ((this as any).controls) {
      (this as any).controls.enabled = true;
      (this as any).controls.target.copy(crater.position);
    }

    // Log 
    console.log(`Energía: ${energiaKT} kt (${energiaJ.toExponential(2)} J)`);

    console.log(`Radio físico del cráter: ${(radioCraterKm * 1000).toFixed(2)} m`);
    console.log(`Radio físico de la explosión: ${radioExplosionKm.toFixed(2)} km`);
  }



  
  reiniciarImpacto(): void {
    
    gsap.globalTimeline.clear();

    if (this.crater) {
      this.scene.remove(this.crater);
      this.crater.geometry.dispose();
      (this.crater.material as THREE.Material).dispose();
      this.crater = null;
    }

    if (this.objetosImpacto && this.objetosImpacto.length) {
      this.objetosImpacto.forEach(obj => {
        try {
          this.scene.remove(obj);
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach(m => (m as THREE.Material).dispose());
            else (mesh.material as THREE.Material).dispose();
          }
        } catch (e) { /* ignore */ }
      });
      this.objetosImpacto = [];
    }

    if (this.particulasImpacto) {
      try {
        this.scene.remove(this.particulasImpacto);
        this.particulasImpacto.geometry.dispose();
        (this.particulasImpacto.material as THREE.Material).dispose();
      } catch (e) { /* ignore */ }
      this.particulasImpacto = null;
    }

    if (this.modeloImpacto) {
      this.scene.remove(this.modeloImpacto);
      this.modeloImpacto.traverse(node => {
        if ((node as THREE.Mesh).geometry) (node as THREE.Mesh).geometry.dispose();
        if ((node as THREE.Mesh).material) {
          const m = (node as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach(mm => (mm as THREE.Material).dispose());
          else (m as THREE.Material).dispose();
        }
      });
      this.modeloImpacto = null;
    }

    // restablecer meteorito
    if (this.meteorito) {
      this.meteorito.visible = true;
      const phi = THREE.MathUtils.degToRad(90 - this.latitudImpacto);
      const theta = THREE.MathUtils.degToRad(this.longitudImpacto + 180);
      const puntoImpacto = new THREE.Vector3().setFromSphericalCoords(this.radioTierra, phi, theta);
      const inicio = puntoImpacto.clone().normalize().multiplyScalar(180);
      this.meteorito.position.copy(inicio);
      this.meteorito.rotation.set(0, 0, 0);
    }

    // restablecer flags y estado
    this.etapa = 'espacio';
    this.animando = false;

    this.initEscenaEspacial();
  }

  animarEntradaDesdeEspacio(): void {
    this.initEscenaEspacial();
  }


  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera)
      this.renderer.render(this.scene, this.camera);
  };

}
