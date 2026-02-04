import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MeteoritoService } from '../../services/meteorito.service';
import { MapaViewService } from '../../services/mapa-view.service';
import { MeteorsDataService } from '../../services/meteors-data.service';

@Component({
  selector: 'app-curiosidades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './curiosidades.component.html',
  styleUrl: './curiosidades.component.css'
})
export class CuriosidadesComponent {

  loading = false;
  selectedMeteoritoCompleto: any = null;

  constructor(
    private meteoritoService: MeteoritoService,
    private meteorsDataService: MeteorsDataService,
    private mapaViewService: MapaViewService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // -----------------------------
  //  Meteoritos más grandes
  // -----------------------------
  meteoritosGrandes = [
    { nombre: 'Hoba', lugar: 'Namibia', peso: '≈ 60 t', tipo: 'Hierro', 
      descripcion: 'El meteorito más grande encontrado intacto, con un peso impresionante que supera a cualquier otro hallazgo en la Tierra y que sigue fascinando a científicos y curiosos por igual.', 
      lat: -19.5833, lon: 17.9333, year: '1920' 
    },
    { nombre: 'El Chaco', lugar: 'Argentina', peso: '≈ 37 t', tipo: 'Hierro', 
      descripcion: 'Parte del legendario Campo del Cielo, conocido por sus gigantescas piezas de hierro que han inspirado estudios y expediciones durante décadas.', 
      lat: -27.6, lon: -61.7, year: '1969' 
    },
    { nombre: 'Cape York', lugar: 'Groenlandia', peso: '≈ 31 t', tipo: 'Hierro', 
      descripcion: 'Usado históricamente por los inuit para fabricar herramientas, es un ejemplo increíble de cómo la humanidad aprovechó los recursos que caían del cielo.', 
      lat: 76.1333, lon: -64.9333, year: '1818' 
    },
    { nombre: 'Armanty', lugar: 'China', peso: '≈ 28 t', tipo: 'Hierro', 
      descripcion: 'Uno de los meteoritos más grandes encontrados en Asia, destaca por su enorme tamaño y conservación, convirtiéndolo en un tesoro para la investigación.', 
      lat: 46.48, lon: 87.23, year: '1898' 
    },
    { nombre: 'Willamette', lugar: 'Estados Unidos', peso: '≈ 15 t', tipo: 'Hierro', 
      descripcion: 'Famoso por su estructura interna única, este meteorito revela patrones internos que narran millones de años de historia cósmica.', 
      lat: 45.35, lon: -122.62, year: '1902' 
    },
    { nombre: 'Sikhote-Alin', lugar: 'Rusia', peso: '≈ 23 t (fragmentos)', tipo: 'Hierro', 
      descripcion: 'Cayó en 1947 como una espectacular lluvia de meteoritos, dejando fragmentos que hoy son estudiados y admirados en todo el mundo.', 
      lat: 46.16, lon: 134.65, year: '1947' 
    },
    { nombre: 'Aletai', lugar: 'China', peso: '≈ 30 t', tipo: 'Hierro', 
      descripcion: 'Descubierto recientemente, muy bien conservado, ofreciendo una ventana a la composición de cuerpos celestes antiguos.', 
      lat: 47.85, lon: 88.13, year: '1898' 
    },
    { nombre: 'Ensisheim', lugar: 'Francia', peso: '≈ 127 kg', tipo: 'Condrita', 
      descripcion: 'El meteorito más antiguo conservado en Europa, cuya historia se remonta al siglo XV y que sigue siendo un objeto de fascinación histórica y científica.', 
      lat: 47.86, lon: 7.35, year: '1492' 
    },
    { nombre: 'Muonionalusta', lugar: 'Suecia', peso: '≈ 230 kg', tipo: 'Hierro', 
      descripcion: 'Con un patrón Widmanstätten espectacular, es un ejemplo perfecto de la belleza interna de los meteoritos metálicos.', 
      lat: 67.5, lon: 23.5, year: '1906' 
    },
    { nombre: 'Seymchan', lugar: 'Rusia', peso: '≈ 325 kg', tipo: 'Pallasita', 
      descripcion: 'Famoso por sus cristales de olivino, combinando ciencia y estética en cada fragmento que se encuentra.', 
      lat: 62.93, lon: 152.38, year: '1967' 
    },
    { nombre: 'Murchison', lugar: 'Australia', peso: '≈ 100 kg', tipo: 'Condrita CM', 
      descripcion: 'Contiene moléculas orgánicas antiguas, ofreciendo pistas sobre la química primitiva del Sistema Solar y la posible aparición de vida.', 
      lat: -36.62, lon: 145.2, year: '1969' 
    },
    { nombre: 'Santa Rosa de Viterbo', lugar: 'Boyacá, Colombia', peso: '≈ 40 kg', tipo: 'Hierro', 
      descripcion: 'Uno de los meteoritos más conocidos de Colombia, conocido por su historia local y su relevancia para la ciencia nacional.', 
      lat: 5.85, lon: -73.37, year: '1810' 
    }
  ];


  // -----------------------------
  // Impactos famosos
  // -----------------------------
  impactosHistoricos = [
    { nombre: 'Chicxulub', lugar: 'Yucatán, México', fecha: 'Hace 66 millones de años', energia: 'Aproximadamente 100 millones de megatones', efecto: 'Extinción masiva.', lat: 21.3, lon: -89.5,  year: '-66000000' },
    { nombre: 'Tunguska', lugar: 'Siberia, Rusia', fecha: '1908', energia: '10–15 megatones', efecto: 'Más de 2.000 km² arrasados.', lat: 60.88, lon: 101.89 , year: '1908'},
    { nombre: 'Chelyabinsk', lugar: 'Rusia', fecha: '2013', energia: '≈ 500 kilotones', efecto: 'Onda expansiva con miles de heridos leves.', lat: 55.15, lon: 61.4 , year: '2013'}
  ];

  // -----------------------------
  // Curiosidades
  // -----------------------------
  curiosidades = [
  'Algunos meteoritos son más antiguos que la Tierra, habiendo formado parte del Sistema Solar primitivo hace más de 4.500 millones de años.',
  'Muchos provienen del cinturón de asteroides entre Marte y Júpiter, viajando millones de kilómetros antes de llegar a nuestro planeta.',
  'Al caer, la mayoría de los meteoritos se desintegran parcialmente en la atmósfera, formando un brillante destello conocido como bólido.',
  'Los meteoritos de hierro son muy resistentes y pueden permanecer intactos durante siglos, ofreciendo pistas sobre la composición del núcleo de planetas primitivos.',
  'Algunos contienen materiales clave para entender el origen de la vida, incluyendo aminoácidos y compuestos orgánicos complejos.',
  'Existen meteoritos con patrones internos espectaculares, como los de Widmanstätten, que revelan su lenta formación en el espacio.',
  'Algunos meteoritos son pallasitas, combinando metal e olivino cristalizado, una rareza que fascina tanto a geólogos como a coleccionistas.',
  'La mayoría de los meteoritos llevan marcas de su paso por la atmósfera, conocidas como corteza de fusión.',
  'Meteoritos de gran tamaño han causado impactos históricos que cambiaron ecosistemas enteros, como el Chicxulub en México.',
  'Existen meteoritos que contienen minerales que no se encuentran naturalmente en la Tierra, lo que ayuda a los científicos a estudiar materiales extraterrestres.',
  'Algunos meteoritos se encuentran repartidos en lluvias de fragmentos, formando campos conocidos como strewn fields.',
  'Meteoritos antiguos permiten estudiar la historia temprana del Sistema Solar y la formación de planetas y asteroides.',
  'Algunos fragmentos son tan grandes que se convierten en atracciones turísticas y museos alrededor del mundo.',
  'El estudio de meteoritos ayuda a comprender los procesos de colisión y evolución de cuerpos celestes.',
  'A través de meteoritos metálicos se puede analizar la presencia de elementos raros y trazas isotópicas valiosas para la investigación.',
  'Algunos meteoritos caídos recientemente han sido recuperados rápidamente, preservando incluso su composición química sin alteraciones por la erosión.',
  'Los meteoritos condritas son ricos en compuestos primitivos que datan del nacimiento del Sistema Solar.'
];

  // -----------------------------
  // Enviar al mapa
  // -----------------------------
  cargarMeteoritoCompleto(name: string, year: string) {
    this.loading = true;

    this.meteorsDataService.getMeteoritoByNameYear(name, year).subscribe({
      next: meteorito => {
        this.selectedMeteoritoCompleto = meteorito;

        // guardar en servicio
        this.meteoritoService.setMeteorito(meteorito);

        this.loading = false;
        this.cdr.detectChanges();

        // navegar al mapa
        this.router.navigate(['/mapa']);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

}
