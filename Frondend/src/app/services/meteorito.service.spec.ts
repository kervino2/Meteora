import { TestBed } from '@angular/core/testing';

import { MeteoritoService } from './meteorito.service';

describe('MeteoritoService', () => {
  let service: MeteoritoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeteoritoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
