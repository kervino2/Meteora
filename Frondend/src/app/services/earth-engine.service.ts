import { Injectable } from '@angular/core';
import * as ee from '@google/earthengine';

@Injectable({
  providedIn: 'root'
})
export class EarthEngineService {
  private initialized = false;

  constructor() {}

  init(clientId: string) {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve(true);
        return;
      }

      ee.data.authenticateViaOauth(clientId, () => {
        ee.initialize(null, null, () => {
          this.initialized = true;
          resolve(true);
        }, (err: any) => reject(err));
      }, (err: any) => reject(err));
    });
  }
}
