import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ___________________Meteoritos TABLA______________________ 

export interface Meteorito {
  id?: number; // opcional si el backend lo genera automáticamente

  name: string;
  status: string;
  fall: string;
  year: string;
  place: string;
  type: string;
  mass: string;
  country: string;

  basic_name: string;
  basic_abbrev: string;
  basic_fall: string;
  basic_yearFound: string;
  basic_country: string;

  classification: string;

  coordinadesExact: string;
  coordinadesLat: string;
  coordinadesLon: string;
  coordinadesRecomend: string;
  coordinadesLatRecomend: string;
  coordinadesLonRecomend: string;

  dataMB109_Lat: string;
  dataMB109_Lon: string;
  dataMB109_Mass: string;
  dataMB109_Piece: string;
  dataMB109_Class: string;
  dataMB109_Weathering: string;
  dataMB109_Fayalite: string;
  dataMB109_Ferrosilite: string;
  dataMB109_Classifier: string;
  dataMB109_Main_mass: string;
  dataMB109_Coments: string;

  impact_date: string;
  impact_lat: string;
  impact_lon: string;
  impact_alt: string;
  impact_vel: string;
  impact_energy: string;
  impact_e: string;

  metBull_fotos: { autor: string; referencia: string; link: string }[];

  Mass_num: number;
  Year_num: number;
  tiene_fotos: boolean;

  ia_nombre: string;
  ia_historia: string;
  ia_importancia: string;
  ia_descubrimiento: string;
  ia_impacto: string;
  ia_velocidad: string;
  ia_energia: string;
  ia_links: string;
  ia_fotos: string;
  ia_videos: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface MeteoritoMapa {
  name: string;
  year: string;
  impact_energy: string | null;
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root',
})
export class MeteorsDataService {

  private apiUrl = 'http://localhost:3000/meteoritos';

  constructor(private http: HttpClient) { }

  /** 🔹 Obtiene todos los meteoritos */
  getMeteoritos(): Observable<MeteoritoMapa[]> {
    return this.http.get<MeteoritoMapa[]>(this.apiUrl);
  }

  /** 🔹 Obtiene un meteorito por ID */
  getMeteoritoByNameYear(name: string, year: string): Observable<Meteorito | null> {
    const url = `${this.apiUrl}/buscar?name=${encodeURIComponent(name)}&year=${encodeURIComponent(year)}`;
    return this.http.get<Meteorito>(url);
  }

  /** 🔹 Obtiene meteoritos según filtro */
  getMeteoritosFiltro(filtro: string): Observable<MeteoritoMapa[]> {
    let url = `${this.apiUrl}/meteoritosF`;

    switch (filtro) {
      case 'impacto':
        url += '?filter=impacto';
        break;
      case 'fotos':
        url += '?filter=fotos';
        break;
      case 'interesante':
        url += '?filter=interesante';
        break;
      default:
        // todos
        break;
    }

    return this.http.get<MeteoritoMapa[]>(url);
  }
}
