import {
  Component,
  Inject,
  OnInit,
  AfterViewInit,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

import {
  MeteorsDataService,
  MeteoritoMapa,
  Meteorito
} from '../../services/meteors-data.service';

import { MeteoritoDetailComponent } from '../meteorito-detail/meteorito-detail.component';
import { MeteoritoService } from '../../services/meteorito.service';
import { MapaViewService } from '../../services/mapa-view.service';

import { VsAlturaComponent } from '../vs-altura/vs-altura.component';
import { VsPesoComponent } from '../vs-peso/vs-peso.component';
import { VsTrayectoriaComponent } from '../vs-trayectoria/vs-trayectoria.component';

@Component({
  selector: 'app-mapa',
  standalone: true,
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css'],
  imports: [
    CommonModule,
    MeteoritoDetailComponent,
    VsAlturaComponent,
    VsPesoComponent,
    VsTrayectoriaComponent
  ]
})
export class MapaComponent implements OnInit, AfterViewInit {
  private map!: any;
  private markerCluster!: any;
  private L: any;
  private mapInitialized = false;

  selectedMeteoritoCompleto: Meteorito | null = null;
  loading = true;
  filtroActivo = 'todos';
  vistaActual = 'mapa';

  constructor(
    private meteorsDataService: MeteorsDataService,
    private meteoritoService: MeteoritoService,
    private mapaViewService: MapaViewService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  // --------------------------------------------------------------------
  // INIT
  // --------------------------------------------------------------------

  private meteoritoPendiente: Meteorito | null = null;


  ngOnInit() {
    this.meteoritoService.meteorito$.subscribe((m) => {
      if (m) {
        this.selectedMeteoritoCompleto = m;

        if (this.mapInitialized) {
          this.mostrarMeteoritoEnMapa(m);
        } else {
          this.meteoritoPendiente = m;
        }
      }
    });
  }



  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.mapaViewService.vistaActual$.subscribe(async v => {
      this.vistaActual = v;
      this.cdr.detectChanges();

      if (v === 'mapa' && !this.mapInitialized) {
        await this.waitForMapContainer();
        await this.inicializarMapa();
        this.mapInitialized = true;
      }
    });
  }

  // --------------------------------------------------------------------
  // MAPA
  // --------------------------------------------------------------------

  private async waitForMapContainer(): Promise<void> {
    let tries = 0;
    while (!document.getElementById('map') && tries < 20) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (!document.getElementById('map')) {
      console.error('❌ No se encontró el contenedor del mapa.');
      throw new Error('No existe el contenedor del mapa.');
    }
  }

  private async inicializarMapa() {
    try {
      this.L = await import('leaflet');
      await import('leaflet.markercluster');

      const mapContainer = document.getElementById('map');
      if (!mapContainer) throw new Error('No existe contenedor del mapa');

      this.map = this.L.map(mapContainer, {
        center: [0, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 10,
        maxBounds: [
          [-85, -180],
          [85, 180]
        ],
        maxBoundsViscosity: 1.0
      });

      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      const markerClusterGroup =
        (this.L as any).markerClusterGroup ||
        (window as any).L.markerClusterGroup;

      this.markerCluster = markerClusterGroup();
      this.map.addLayer(this.markerCluster);

      this.cargarMeteoritos(this.filtroActivo);

      if (this.meteoritoPendiente) {
        this.mostrarMeteoritoEnMapa(this.meteoritoPendiente);
        this.meteoritoPendiente = null;
      }


    } catch (err) {
      console.error('Error al inicializar mapa:', err);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --------------------------------------------------------------------
  // CARGA DE METEORITOS
  // --------------------------------------------------------------------

  cargarMeteoritos(filtro: string = 'todos') {
    if (!this.L || !this.markerCluster) return;

    this.loading = true;
    this.markerCluster.clearLayers();

    const fuente$ =
      filtro === 'todos'
        ? this.meteorsDataService.getMeteoritos()
        : this.meteorsDataService.getMeteoritosFiltro(filtro);

    fuente$.subscribe({
      next: (data: any[]) => {
        if (!Array.isArray(data)) {
          console.warn('Datos inválidos:', data);
          this.loading = false;
          return;
        }

        const meteoritosMapa: MeteoritoMapa[] = data
          .map(m => {
            const lat = m.lat || m.impact_lat || m.dataMB109_Lat;
            const lon = m.lon || m.impact_lon || m.dataMB109_Lon;
            if (!lat || !lon) return null;
            return {
              name: m.name,
              year: m.year || 'Desconocido',
              impact_energy: m.impact_energy || null,
              lat: lat.toString(),
              lon: lon.toString()
            };
          })
          .filter((m): m is MeteoritoMapa => m !== null);

        this.agregarMeteoritos(meteoritosMapa).then(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: err => {
        console.error('Error al cargar meteoritos:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private async agregarMeteoritos(meteoritos: MeteoritoMapa[]): Promise<void> {
    const chunkSize = 500;
    for (let i = 0; i < meteoritos.length; i += chunkSize) {
      const chunk = meteoritos.slice(i, i + chunkSize);

      const markers = chunk
        .map(m => {
          const lat = parseFloat(m.lat);
          const lon = parseFloat(m.lon);
          if (isNaN(lat) || isNaN(lon)) return null;

          const marker = this.L.marker([lat, lon], {
            icon: this.L.icon({
              iconUrl: 'assets/PinMeteorito.png',
              iconSize: [40, 40]
            })
          });

          marker.bindPopup(`<b>${m.name}</b><br>Año: ${m.year}`);
          marker.on('click', () => this.cargarMeteoritoCompleto(m.name, m.year));

          return marker;
        })
        .filter(m => m !== null);

      this.markerCluster.addLayers(markers as any);

      await new Promise(r => setTimeout(r));
    }
  }

  // --------------------------------------------------------------------
  // ACCIONES
  // --------------------------------------------------------------------

  aplicarFiltro(filtro: string) {
    this.filtroActivo = filtro;
    this.cargarMeteoritos(filtro);
  }

  cargarMeteoritoCompleto(name: string, year: string) {
    this.loading = true;

    this.meteorsDataService.getMeteoritoByNameYear(name, year).subscribe({
      next: meteorito => {
        this.selectedMeteoritoCompleto = meteorito;
        this.meteoritoService.setMeteorito(meteorito);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --------------------------------------------------------------------
  // MOSTRAR METEORITO EN MAPA
  // --------------------------------------------------------------------

  mostrarMeteoritoEnMapa(m: Meteorito) { 
    const lat = parseFloat(m.coordinadesLat || m.dataMB109_Lat);
    const lon = parseFloat(m.coordinadesLon || m.dataMB109_Lon);


    if (isNaN(lat) || isNaN(lon) || !this.map) return;

    this.map.setView([lat, lon], 10);

    this.markerCluster?.eachLayer((layer: any) => {
      if (
        layer.getLatLng &&
        layer.getLatLng().lat === lat &&
        layer.getLatLng().lng === lon
      ) {
        layer.openPopup();
      }
    });
  }

  cerrarPanel() {
    this.selectedMeteoritoCompleto = null;
    this.volverAlMapa();
  }

  volverAlMapa() {
    this.vistaActual = 'mapa';

    this.cdr.detectChanges();
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 0);
  }
}
