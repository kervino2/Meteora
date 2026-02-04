import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogModule,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions
} from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  MatExpansionModule
} from '@angular/material/expansion'; 
import { MatAccordion } from '@angular/material/expansion'; 
import { MatExpansionPanel } from '@angular/material/expansion';

@Component({
  selector: 'app-origen',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatExpansionModule,
    MatAccordion,
    MatExpansionPanel
  ],
  templateUrl: './origen.component.html',
  styleUrls: ['./origen.component.css']
})
export class OrigenComponent {
  constructor(private dialog: MatDialog) {}

  openSourceDialog(source: string) {
    this.dialog.open(SourceDialogComponent, {
      width: '600px',
      data: { source }
    });
  }
}

// Diálogo con detalles
@Component({
  selector: 'app-source-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions
  ],
  template: `
    <h2 mat-dialog-title>Más sobre {{ data.source }}</h2>
    <mat-dialog-content>
      <ng-container [ngSwitch]="data.source">
        <div *ngSwitchCase="'Cinturón de asteroides'">
          <p>
            El cinturón de asteroides es la principal fuente de meteoritos. 
            La mayoría proviene de colisiones entre asteroides como los de las familias Karin, Koronis y Massalia.
          </p>
          <p>
            Referencia:
            <a href="https://www.cnrs.fr/en/press/origin-most-meteorites-finally-revealed" target="_blank">
              CNRS Research
            </a>
          </p>
        </div>

        <div *ngSwitchCase="'Marte'">
          <p>
            Algunos meteoritos fueron eyectados desde Marte por impactos. 
            Estos contienen gases atrapados idénticos a los de la atmósfera marciana.
          </p>
          <p>
            Referencia:
            <a href="https://www.nasa.gov/mars/" target="_blank">NASA Mars Missions</a>
          </p>
        </div>

        <div *ngSwitchCase="'Luna'">
          <p>
            Los meteoritos lunares permiten estudiar regiones no muestreadas por las misiones Apolo.
          </p>
          <p>
            Referencia:
            <a href="https://solarsystem.nasa.gov/moon/" target="_blank">NASA Lunar Science</a>
          </p>
        </div>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `
})
export class SourceDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
