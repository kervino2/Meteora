import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meteorito } from '../../services/meteors-data.service';
import { FullscreenImageService } from '../../services/fullscreen-image.service';

@Component({
  selector: 'app-location-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-viewer.component.html',
  styleUrls: ['./location-viewer.component.css']
})
export class LocationViewerComponent implements OnChanges {

  @Input() meteorito!: Meteorito | null;
  @Output() sinImagen = new EventEmitter<boolean>();

  imageUrl: string | null = null;
  loading = false;
  heading = 0;

  private apiKey = 'AIzaSyChdxXZijJkSNNZPrs6ZJjOWu_Q-30XuEE';
  private baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
  private metaUrl = 'https://maps.googleapis.com/maps/api/streetview/metadata';
  private size = '600x400';


  constructor(private fullscreenSrv: FullscreenImageService) { }

  openFullscreen(img: string) {
    this.fullscreenSrv.open(img);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log("cargando")
    if (changes['meteorito'] && this.meteorito) {
      this.loadStreetView();
    }
  }

  async loadStreetView(): Promise<void> {
    if (!this.meteorito) return;

    const lat = parseFloat(
      this.meteorito.coordinadesLat ||
      this.meteorito.impact_lat ||
      '0'
    );

    const lon = parseFloat(
      this.meteorito.coordinadesLon ||
      this.meteorito.impact_lon ||
      '0'
    );

    if (!lat || !lon) {
      this.imageUrl = null;
      this.sinImagen.emit(true);
      return;
    }

    this.loading = true;
    const nearby = await this.buscarCercano(lat, lon);

    if (nearby) {
      this.imageUrl =
        `${this.baseUrl}?location=${nearby.lat},${nearby.lon}` +
        `&size=${this.size}&fov=90&heading=${this.heading}&pitch=0&key=${this.apiKey}`;

      this.sinImagen.emit(false);
    } else {
      this.imageUrl = null;
      this.sinImagen.emit(true);
    }

    this.loading = false;
  }

  private async buscarCercano(lat: number, lon: number): Promise<{ lat: number, lon: number } | null> {
    const pasos = [0, 0.002, -0.002, 0.005, -0.005, 0.01, -0.01];

    for (const dLat of pasos) {
      for (const dLon of pasos) {
        const url = `${this.metaUrl}?location=${lat + dLat},${lon + dLon}&key=${this.apiKey}`;

        try {
          const res = await fetch(url);
          const meta = await res.json();

          if (meta.status === 'OK') {
            return { lat: lat + dLat, lon: lon + dLon };
          }
        } catch { }
      }
    }

    return null;
  }

  rotateLeft(): void {
    this.heading = (this.heading - 45 + 360) % 360;
    this.loadStreetView();
  }

  rotateRight(): void {
    this.heading = (this.heading + 45) % 360;
    this.loadStreetView();
  }
}
