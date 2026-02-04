import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapaViewService {
  private vistaActualSource = new BehaviorSubject<string>('mapa');
  vistaActual$ = this.vistaActualSource.asObservable();

  setVista(vista: string) {
    this.vistaActualSource.next(vista);
  }

  getVista() {
    return this.vistaActualSource.value;
  }
}