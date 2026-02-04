import { Component, HostListener } from '@angular/core';
import { FullscreenImageService } from '../../services/fullscreen-image.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fullscreen-image',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './fullscreen-image.component.html',
  styleUrls: ['./fullscreen-image.component.css']
})
export class FullscreenImageComponent {
  constructor(public fullscreenSrv: FullscreenImageService) {}

  close() {
    this.fullscreenSrv.close();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.close();
  }
}
