import { TestBed } from '@angular/core/testing';

import { MapaViewService } from './mapa-view.service';

describe('MapaViewService', () => {
  let service: MapaViewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapaViewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
