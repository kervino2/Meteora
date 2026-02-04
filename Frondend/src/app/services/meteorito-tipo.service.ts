import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

export interface MeteoritoTipo {
tituloMostrado: any;
  tipo: string;
  urlImage: string;
  explicacion: string;
  agrupado: string[];

}
@Injectable({
  providedIn: 'root'
})
export class MeteoritoTipoService {

  private apiUrl = 'http://localhost:3000/tiposm';
  private tiposCache: MeteoritoTipo[] = [];
  private cargado = false;

  constructor(private http: HttpClient) { }

  /** 🟦 Cargar una sola vez */
  loadTipos(): Observable<MeteoritoTipo[]> {
    if (this.cargado) {
      return of(this.tiposCache); // inmediato
    }

    return this.http.get<MeteoritoTipo[]>(this.apiUrl).pipe(
      tap(data => {
        this.tiposCache = data;
        this.cargado = true;
      })
    );
  }

  /** 🟩 Buscar un tipo */
  findTipo(nombre: string): MeteoritoTipo | undefined {
    if (!nombre) return undefined;

    const n = nombre.toLowerCase();

    // buscar tipo principal
    let encontrado = this.tiposCache.find(t => t.tipo.toLowerCase() === n);
    if (encontrado) return encontrado;

    // buscar en agrupados
    return this.tiposCache.find(
      t => t.agrupado.some(g => g.toLowerCase() === n)
    );
  }
}
