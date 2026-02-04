import { Routes } from '@angular/router';
import { MapaComponent } from './componentes/mapa/mapa.component';
import { VsAlturaComponent } from './componentes/vs-altura/vs-altura.component';
import { VsPesoComponent } from './componentes/vs-peso/vs-peso.component';
import { VsTrayectoriaComponent } from './componentes/vs-trayectoria/vs-trayectoria.component';
import { OrigenComponent } from './componentes/origen/origen.component';
import { InicioComponent } from './componentes/inicio/inicio.component';
import { CuriosidadesComponent } from './componentes/curiosidades/curiosidades.component';
import { MeteoritoDetailComponent } from './componentes/meteorito-detail/meteorito-detail.component';
import { LocationViewerComponent } from './componentes/location-viewer/location-viewer.component';




export const routes: Routes = [
  { path: "mapa", component: MapaComponent },
  { path: 'inicio', component: InicioComponent },
  { path: "vsAltura", component: VsAlturaComponent },
  { path: "vsPeso", component: VsPesoComponent },  
  { path: 'vsTrayectoria', component: VsTrayectoriaComponent },
  { path: 'origen', component: OrigenComponent },
  { path: 'curiosidades', component: CuriosidadesComponent },
  { path: 'meteorito-detail', component: MeteoritoDetailComponent },
  { path: 'location-viewer', component: LocationViewerComponent },
  { path: '', redirectTo: '/inicio', pathMatch: 'full' }
];
