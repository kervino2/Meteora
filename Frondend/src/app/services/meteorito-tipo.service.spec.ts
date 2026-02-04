import { TestBed } from '@angular/core/testing';

import { MeteoritoTipoService } from './meteorito-tipo.service';

describe('MeteoritoTipoService', () => {
  let service: MeteoritoTipoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeteoritoTipoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
