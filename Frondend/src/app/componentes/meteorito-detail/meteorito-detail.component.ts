import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meteorito } from '../../services/meteors-data.service';
import { MeteoritoService } from '../../services/meteorito.service';
import { MapaViewService } from '../../services/mapa-view.service';
import { LocationViewerComponent } from "../location-viewer/location-viewer.component";
import { MeteoritoTipoService } from '../../services/meteorito-tipo.service';
import { FullscreenImageService } from '../../services/fullscreen-image.service';

@Component({
  selector: 'app-meteorito-detail',
  standalone: true,
  imports: [CommonModule, LocationViewerComponent],
  templateUrl: './meteorito-detail.component.html',
  styleUrl: './meteorito-detail.component.css'
})
export class MeteoritoDetailComponent {

  currentIndex = 0;
  fotosParsed: any[] = [];
  tipoInfo = {
    imagen: 'assets/fotos/default_tipo.jpg',
    descripcion: 'Este meteorito no tiene información de tipo disponible.',
    tipoNormalizado: ''
  };

  constructor(
    private meteoritoService: MeteoritoService,
    private mapaViewService: MapaViewService,
    private tipoService: MeteoritoTipoService,
    private fullscreenSrv: FullscreenImageService
  ) { }

  @Input() meteorito?: Meteorito;
  @Output() closed = new EventEmitter<void>();

  irAltura() {
    this.mapaViewService.setVista('vsAltura');
  }

  irAVsPeso() {
    this.mapaViewService.setVista('vsPeso');
  }

  irAVsImpacto() {
    this.mapaViewService.setVista('vsImpacto');
  }

  irAVsTrayectoria() {
    console.log("vsTrayectoria")
    this.mapaViewService.setVista('vsTrayectoria');
  }

  openFullscreen(img: string) {
    this.fullscreenSrv.open(img);
  }

  close() {
    this.mapaViewService.setVista('mapa');
    this.closed.emit();
  }

  mostrarTipo(): boolean {
    const c1 = this.meteorito?.classification;
    const c2 = this.meteorito?.dataMB109_Class;

    const valido = (v: string | null | undefined) =>
      v !== null &&
      v !== undefined &&
      v.trim() !== '' &&
      v !== "No hay información";

    return valido(c1) || valido(c2);
  }


  ngOnInit() {
    this.procesarFotos();
    this.tipoService.loadTipos().subscribe(() => {
      this.actualizarInfoTipo();  // ahora sí encuentra coincidencias
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['meteorito'] && changes['meteorito'].currentValue) {
      this.procesarFotos();
      // Scroll al inicio cuando cambia el meteorito
      this.mostrarFoto = true;

      this.tipoService.loadTipos().subscribe(() => {
        this.actualizarInfoTipo();
      });
      setTimeout(() => {
        const panel = document.querySelector('.detail-panel');
        if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  }

  private actualizarInfoTipo() {
    const tipoRaw = this.meteorito?.classification || this.meteorito?.dataMB109_Class;

    if (!tipoRaw) {
      this.tipoInfo = {
        imagen: 'assets/fotos/default_tipo.jpg',
        descripcion: 'Este meteorito no tiene información de tipo disponible.',
        tipoNormalizado: ''
      };
      return;
    }
    const data = this.tipoService.findTipo(tipoRaw);

    if (!data) {
      this.tipoInfo = {
        imagen: 'assets/fotos/default_tipo.jpg',
        descripcion: 'Este meteorito no tiene información de tipo disponible.',
        tipoNormalizado: tipoRaw
      };
    } else {
      this.tipoInfo = {
        imagen: data.urlImage,
        descripcion: data.explicacion,
        tipoNormalizado: data.tipo
      };
    }
  }


  procesarFotos() {
    this.currentIndex = 0;
    if (this.meteorito?.metBull_fotos) {
      try {
        if (typeof this.meteorito.metBull_fotos === 'string') {
          this.fotosParsed = JSON.parse(this.meteorito.metBull_fotos);
        } else {
          this.fotosParsed = this.meteorito.metBull_fotos;
        }
      } catch (e) {
        console.error('Error al parsear metBull_fotos:', e);
        this.fotosParsed = [];
      }
    } else {
      this.fotosParsed = [];
    }
  }

  mostrarFoto = true;

  onSinImagen(sinFoto: boolean) {
    this.mostrarFoto = !sinFoto;
  }


  nextSlide() {
    if (this.currentIndex < this.fotosParsed.length - 1) this.currentIndex++;
  }

  prevSlide() {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  setDefaultImage(event: any) {
    // event.target.src = 'assets/imagen_no_disponible.png';
  }

}
