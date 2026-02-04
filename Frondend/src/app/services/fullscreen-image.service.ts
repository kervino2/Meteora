import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FullscreenImageService {
  private imageSource = new BehaviorSubject<string | null>(null);
  currentImage$ = this.imageSource.asObservable();

  open(imageUrl: string) {
    this.imageSource.next(imageUrl);
  }

  close() {
    this.imageSource.next(null);
  }
}
