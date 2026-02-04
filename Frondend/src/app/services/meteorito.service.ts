import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class MeteoritoService {

  private meteoritoSource = new BehaviorSubject<any>(null);
  meteorito$ = this.meteoritoSource.asObservable();

  setMeteorito(data: any) {
    this.meteoritoSource.next(data);
  }

  // Obtiene el valor actual del meteorito (sin suscripción)
  getMeteorito() {
    return this.meteoritoSource.getValue();
  }
}