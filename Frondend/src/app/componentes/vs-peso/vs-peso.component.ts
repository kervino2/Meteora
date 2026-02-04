import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeteoritoService } from '../../services/meteorito.service';


interface DropOffset {
  x?: number;
  y?: number;
  z?: number;
}

interface PlatoItem {
  name: string;
  modelPath: string;
  weight: number;
  scale?: number;
  dropOffset?: DropOffset;
}

@Component({
  selector: 'app-vs-peso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vs-peso.component.html',
  styleUrls: ['./vs-peso.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VsPesoComponent {

  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls: any;

  pesoTotal = 1000000;
  objetoScale = 1;

  objectsList: PlatoItem[] = [
    { name: 'Automóvil compacto', modelPath: 'assets/modelos3d/car.glb', weight: 1000000, scale: 100 },

    { name: 'Motocicleta pequeña', modelPath: 'assets/modelos3d/motocicleta.glb', weight: 120000, scale: 0.5, dropOffset: { x: 0, y: 1, z: 0 } },

    { name: 'Televisor de 32 pulgadas', modelPath: 'assets/modelos3d/tv.glb', weight: 15000, scale: 2, dropOffset: { x: -5, y: 2, z: 0 } },

    { name: 'Sillas de escritorio', modelPath: 'assets/modelos3d/silla_escritorio.glb', weight: 10000, scale: 0.05 },

    { name: 'Bolsas de azúcar', modelPath: 'assets/modelos3d/azucar.glb', weight: 5000, scale: 5, dropOffset: { x: 0, y: 0.5, z: 0 } },

    { name: 'Botella de agua', modelPath: 'assets/modelos3d/botella_de_agua.glb', weight: 1000, scale: 10 },

    { name: 'Libro', modelPath: 'assets/modelos3d/book.glb', weight: 500, scale: 1 },

    { name: 'Celulares', modelPath: 'assets/modelos3d/smartphone.glb', weight: 200, scale: 10, dropOffset: { x: 0, y: 0, z: 0 } },

    { name: 'Lápiz', modelPath: 'assets/modelos3d/lapiz_de_madera.glb', weight: 20, scale: 0.3 },

    { name: 'Clip', modelPath: 'assets/modelos3d/paper_clip.glb', weight: 1, scale: 15 },
  ];


  constructor(private meteoritoService: MeteoritoService) { }

  currentObject: PlatoItem = this.objectsList[0];
  equivalencia = 0;

  plateX = 0;
  plateY = 0;
  plateZ = 0;

  private loadedModel: THREE.Group | null = null;

  ngAfterViewInit(): void {
    this.initScene();
    this.loadPlate();
    this.preloadCurrentModel().then(() => {
      this.spawnObjects();
      this.animate();
    });
  }

  /** Inicializa escena, cámara y luces */
  private initScene(): void {
    if (typeof document === 'undefined') return; 

    let meteorito = this.meteoritoService.getMeteorito();
    if (meteorito) {
      this.pesoTotal = meteorito.mass ?? meteorito.dataMB109_Mass ?? meteorito.Mass_num ?? 50;
    }

    this.meteoritoService.meteorito$.subscribe(m => {
      if (m) meteorito = m;
      this.pesoTotal = m?.mass || m?.dataMB109_Mass || meteorito.Mass_num || 50;
    });

    const width = this.canvasContainer.nativeElement.clientWidth;
    const height = this.canvasContainer.nativeElement.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff); // fondo blanco para animación

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 4, 7);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.canvasContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 20, 30);
    this.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambientLight);
  }

  /** Carga plato */
  private loadPlate(): void {
    const loader = new GLTFLoader();
    loader.load(
      'assets/modelos3d/balanza.glb',
      (gltf: any) => {
        const plate = gltf.scene;
        plate.position.set(this.plateX, this.plateY, this.plateZ);
        plate.scale.set(3, 3, 3);
        this.scene.add(plate);
      },
      undefined,
      (err: any) => console.error('Error cargando plato', err)
    );
  }

  private getDropPosition(item: PlatoItem): { x: number; y: number; z: number } {

    const range = 7;

    const offsetX = item.dropOffset?.x ?? 0;
    const offsetY = item.dropOffset?.y ?? 0;
    const offsetZ = item.dropOffset?.z ?? 0;

    return {
      x: this.plateX + offsetX + (Math.random() - 0.5) * range,
      z: this.plateZ + offsetZ + (Math.random() - 0.5) * range,
      y: this.plateY + offsetY + 30 + Math.random() * 10
    };
  }

  formatWeight(weight: number): string {
    if (weight >= 1_000_000) {
      const tons = weight / 1_000_000;
      return `${tons % 1 === 0 ? tons : tons.toFixed(2)} tonelada${tons !== 1 ? 's' : ''}`;
    }

    if (weight >= 1_000) {
      const kg = weight / 1_000;
      return `${kg % 1 === 0 ? kg : kg.toFixed(2)} kg`;
    }

    return `${weight} gr`;
  }


  /** Pre-carga modelo seleccionado */
  private preloadCurrentModel(): Promise<void> {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(this.currentObject.modelPath,
        (gltf: any) => {
          this.loadedModel = gltf.scene;
          resolve();
        },
        undefined,
        (err: any) => {
          console.error('Error cargando modelo', err);
          reject(err);
        });
    });
  }

  limitado = false;
  /** Genera y distribuye los objetos en el plato */
  spawnObjects(): void {
    if (!this.loadedModel) return;

    this.equivalencia = Math.floor(this.pesoTotal / this.currentObject.weight);
    this.limitado = false;
    if (this.equivalencia > 1000) {
      this.limitado = true;
    }
    for (let i = 0; i < this.equivalencia; i++) {
      if (this.limitado && i > 1000) {
        return;
      }
      const clone = this.loadedModel.clone();
      const finalScale = (this.currentObject.scale ?? 1) * this.objetoScale;
      clone.scale.set(finalScale, finalScale, finalScale);
      clone.name = `${this.currentObject.name}_clone_${i}`;

      const pos = this.getDropPosition(this.currentObject);
      clone.position.set(pos.x, pos.y, pos.z);

      this.scene.add(clone);


      const offsetY = this.currentObject.dropOffset?.y ?? 0;
      const targetY = this.plateY + offsetY + this.objetoScale * 0.5;

      const speed = 0.3 + Math.random() * 0.2;

      const fall = () => {
        if (clone.position.y > targetY) {
          clone.position.y -= speed;
          requestAnimationFrame(fall);
        } else {
          clone.position.y = targetY;
        }
      };
      fall();
    }
  }

  onObjectChange(name: string): void {
    const selected = this.objectsList.find(o => o.name === name);
    if (!selected) return;

    // Limpiar objetos antiguos
    this.scene.children
      .filter(obj => obj.name.includes('_clone_'))
      .forEach(obj => this.scene.remove(obj));

    this.currentObject = selected;

    // Precarga el nuevo modelo y luego genera los objetos
    this.preloadCurrentModel().then(() => {
      this.spawnObjects();
    });
  }

  /** Animación */
  animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
