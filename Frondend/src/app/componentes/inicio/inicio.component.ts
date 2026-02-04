import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeteoritoTipo, MeteoritoTipoService } from '../../services/meteorito-tipo.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit {

  totalRegistros = 1450;

  tiposMeteoritos: MeteoritoTipo[] = [];

  /** 🌎 Lista general de tipos importantes (SIN subtipos específicos) */
  tiposPrincipales = [
    { clave: 'chondrite', nombre: 'Condritas (Chondrites)' },
    { clave: 'achondrite', nombre: 'Acondritas (Achondrites)' },
    { clave: 'iron-number', nombre: 'Meteoritos Metálicos (Irons)' }, // << COINCIDE EXACTO
    { clave: 'ivb', nombre: 'Rocosos-Metálicos (Stony-Irons)' },
    { clave: 'martian', nombre: 'Meteoritos Marcianos' },
    { clave: 'lunar', nombre: 'Meteoritos Lunares' }
  ];

  glosario = [
    { termino: 'Meteorito', descripcion: 'Fragmento de un cuerpo celeste que logra llegar a la superficie terrestre.' },
    { termino: 'Meteoro', descripcion: 'Fenómeno luminoso causado por un objeto que entra a la atmósfera y se desintegra.' },
    { termino: 'Asteroide', descripcion: 'Cuerpo rocoso más grande que orbita el Sol, la mayoría se encuentran entre Marte y Júpiter.' },
    { termino: 'Cráter de impacto', descripcion: 'Depresión en la superficie terrestre creada por la colisión de un meteorito.' },
  ];

  funciones = [
    'Explorar meteoritos en un mapa interactivo con puntos marcados.',
    'Acceder a información general del meteorito con un clic.',
    'Aprender sobre tipos, historia y glosario de meteoritos.',
    'Visualizar datos complejos mediante diagramas (masa, altura, energía, etc.).',
    'Navegar fácilmente sin necesidad de conocimientos técnicos.',
    'Usar la aplicación con rapidez y sin errores.',
  ];

  tiposVisibles: any[] = [];
  index = 0;

  constructor(private tipoService: MeteoritoTipoService) { }

  ngOnInit(): void {
    this.tipoService.loadTipos().subscribe((tipos) => {
      const filtrados = this.seleccionarTiposImportantes(tipos);
      this.tiposMeteoritos = filtrados;
      this.actualizarVista();
    });
  }

  /** 🎯 Mostrar solo 3 tarjetas */
  actualizarVista() {
    const total = this.tiposMeteoritos.length;
    if (total === 0) {
      this.tiposVisibles = [];
      return;
    }

    this.tiposVisibles = [
      this.formatearTipo(this.tiposMeteoritos[this.index % total]),
      this.formatearTipo(this.tiposMeteoritos[(this.index + 1) % total]),
      this.formatearTipo(this.tiposMeteoritos[(this.index + 2) % total])
    ];
  }

  /** 🎨 Asigna nombre general basado en la lista principal */
  private formatearTipo(tipo: MeteoritoTipo): any {
    const raw = tipo?.tipo?.toLowerCase() || '';

    const encontrado = this.tiposPrincipales.find(t => {
      const clave = t.clave.toLowerCase();
      return raw.includes(clave) ||
        tipo.agrupado?.some(a => a.toLowerCase().includes(clave));
    });


    const titulo = encontrado?.nombre || tipo.tipo || 'Tipo desconocido';

    return { ...tipo, tituloMostrado: titulo };
  }

  next() {
    this.index = (this.index + 1) % this.tiposMeteoritos.length;
    this.actualizarVista();
  }

  prev() {
    this.index = (this.index - 1 + this.tiposMeteoritos.length) % this.tiposMeteoritos.length;
    this.actualizarVista();
  }

  /** 🔍 Filtrado basado en categorías amplias */
  private seleccionarTiposImportantes(tipos: MeteoritoTipo[]): MeteoritoTipo[] {
    if (!tipos || tipos.length === 0) return [];

    // Solo claves principales exactas.
    const claves = this.tiposPrincipales.map(t => t.clave.toLowerCase());

    return tipos.filter(t => {
      const tipo = t.tipo?.toLowerCase().trim() || '';
      const agrupados = (t.agrupado || []).map(a => a.toLowerCase().trim());

      const esTipoPrincipal = claves.includes(tipo);
      const esAgrupadoPrincipal = agrupados.some(a => claves.includes(a));

      return esTipoPrincipal || esAgrupadoPrincipal;
    });
  }

}
