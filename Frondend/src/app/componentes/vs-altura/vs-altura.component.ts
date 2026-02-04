import { Component, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { MeteoritoService } from '../../services/meteorito.service';

@Component({
  selector: 'app-vs-altura',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vs-altura.component.html',
  styleUrls: ['./vs-altura.component.css']
})
export class VsAlturaComponent implements AfterViewInit {
  tamanoPiedra = 1;
  pisoY = 600;
  maxAltura = 10;
  lineasReferencia: number[] = [];

  // Objetos de referencia
  objetos = [
    { id: 0, nombre: 'Meteorito', tamano: this.tamanoPiedra, img: 'assets/meteoroSilueta.png', x: 0, visible: true },
    { id: 1, nombre: 'Regla', tamano: 0.3, img: 'assets/regla.png', x: 0, visible: true },
    { id: 2, nombre: 'Niño', tamano: 1.3, img: 'assets/nino.png', x: 0, visible: true },
    { id: 3, nombre: 'Persona', tamano: 1.7, img: 'assets/persona.png', x: 0, visible: true },
    { id: 4, nombre: 'Puerta', tamano: 2, img: 'assets/puerta.png', x: 0, visible: false },
    { id: 5, nombre: 'Casa', tamano: 5.5, img: 'assets/casa.png', x: 0, visible: false },
    { id: 6, nombre: 'Apartamento', tamano: 24, img: 'assets/apartamento.png', x: 0, visible: false },
  ];

  indiceInicioVisible = 1;
  objetosVisibles = 3;
  pesoTotal: number = 50;

  constructor(private meteoritoService: MeteoritoService) {
    // Inicializar datos del meteorito
    const meteorito = this.meteoritoService.getMeteorito();
    if (meteorito) {
      this.pesoTotal = meteorito.mass ?? meteorito.dataMB109_Mass ?? meteorito.Mass_num ?? 50;
    }

    // Suscripción reactiva a cambios del meteorito
    this.meteoritoService.meteorito$.subscribe(m => {
      if (m) {
        this.pesoTotal = m.mass ?? m.dataMB109_Mass ?? 50;
        this.calcularTamano();
      }
    });

    this.calcularTamano();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const svg = document.querySelector('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        this.pisoY = rect.height - 30;

        const meteorito = this.objetos.find(o => o.id === 0);
        if (meteorito) meteorito.x = rect.width * 0.1; 

        const visibles = this.objetos.filter(o => o.visible && o.id !== 0);
        const ancho = rect.width * 0.8; // usar el resto del espacio
        const separacion = ancho / (this.objetosVisibles + 1);

        visibles.forEach((obj, i) => {
          obj.x = rect.width * 0.2 + separacion * (i + 1);
        });

        this.calcularAlturaVisible();
      }
    }, 200);
  }



  @HostListener('window:resize')
  onResize() {
    const svg = document.querySelector('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      this.pisoY = rect.height - 30;
      this.calcularAlturaVisible();
    }
  }

  // === CÁLCULO DE TAMAÑO DEL METEORITO ===
  calcularTamano() {
    const densidad = 3500;
    const volumen = this.pesoTotal / densidad;
    const radio = Math.cbrt((3 * volumen) / (4 * Math.PI));
    this.tamanoPiedra = +(radio * 2).toFixed(2);

    const meteoritoObj = this.objetos.find(o => o.id === 0);
    if (meteoritoObj) meteoritoObj.tamano = this.tamanoPiedra;

    this.actualizarAlturas();
  }

  // === ESCALA Y REFERENCIAS ===
  calcularAlturaVisible() {
    const visibles = this.objetos.filter(o => o.visible);
    const mayor = Math.max(...visibles.map(o => o.tamano));
    this.maxAltura = mayor * 1.1;

    let paso = 1;
    if (this.maxAltura > 50) paso = 5;
    if (this.maxAltura > 100) paso = 10;
    if (this.maxAltura > 500) paso = 50;
    if (this.maxAltura > 1000) paso = 100;
    if (this.maxAltura > 10000) paso = 1000;

    this.lineasReferencia = Array.from(
      { length: Math.ceil(this.maxAltura / paso) },
      (_, i) => (i + 1) * paso
    );

    this.actualizarAlturas();
  }

  escala(valor: number): number {
    const factor = this.pisoY / this.maxAltura;
    return valor * factor;
  }

  actualizarAlturas() {
    if (typeof document === 'undefined') return;

    this.objetos.forEach((obj, i) => {
      const el = document.getElementById(`img-${obj.id}`);
      if (!el) return;
      const size = this.escala(obj.tamano);
      const yFinal = this.pisoY - size;

      gsap.to(el, {
        attr: { y: yFinal, width: size, height: size },
        duration: 0.6,
        ease: 'power2.out'
      });
    });
  }

  // === MOVIMIENTO CARRUSEL ===
  mover(direccion: 'izquierda' | 'derecha') {
    const limiteIzquierda = this.indiceInicioVisible > 1;
    const limiteDerecha = (this.indiceInicioVisible + this.objetosVisibles) < this.objetos.length;
    const contenedor = document.querySelector('svg');
    const anchoVisible = contenedor ? contenedor.getBoundingClientRect().width * 0.8 : 900;
    const separacion = anchoVisible / (this.objetosVisibles + 1);
    const posicionesX = Array.from({ length: this.objetosVisibles }, (_, i) => (i + 1) * separacion);

    if (direccion === 'izquierda' && limiteDerecha) {
      this.cambiarVisibles(+1, posicionesX);
    }

    if (direccion === 'derecha' && limiteIzquierda) {
      this.cambiarVisibles(-1, posicionesX);
    }
  }


  cambiarVisibles(direccion: number, posicionesX: number[]) {
    const nuevoIndice = this.indiceInicioVisible + direccion;
    if (nuevoIndice < 1 || nuevoIndice + this.objetosVisibles > this.objetos.length) return;

    // Mantener meteorito visible y fijo
    this.objetos.forEach(o => {
      if (o.id === 0) {
        o.visible = true;
        return;
      }
      o.visible = false;
    });

    // Mostrar nuevos visibles (solo referencias)
    for (let i = 0; i < this.objetosVisibles; i++) {
      const index = nuevoIndice + i;
      if (this.objetos[index]) {
        const obj = this.objetos[index];
        obj.visible = true;
        obj.x = posicionesX[i] + 200; // espacio a la derecha del meteorito

        gsap.fromTo(
          `#group-${obj.id}`,
          { opacity: 0, x: obj.x + (direccion > 0 ? 100 : -100) },
          { opacity: 1, x: obj.x, duration: 0.6, ease: 'power2.out' }
        );
      }
    }

    this.indiceInicioVisible = nuevoIndice;
    this.calcularAlturaVisible();
  }


  // === ANIMACIONES ===
  animarAparicion(obj: any) {
    obj.visible = true;
    gsap.fromTo(
      `#group-${obj.id}`,
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
    );
  }

  animarDesaparicion(obj: any) {
    gsap.to(`#group-${obj.id}`, {
      opacity: 0,
      scale: 0.4,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => { obj.x = -9999 }
    });
  }

  // === CONTROL CON TECLADO ===
  @HostListener('window:keydown', ['$event'])
  manejarTeclas(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') this.mover('derecha');
    if (event.key === 'ArrowRight') this.mover('izquierda');
  }
}
