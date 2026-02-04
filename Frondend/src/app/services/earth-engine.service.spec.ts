import { TestBed } from '@angular/core/testing';

import { EarthEngineService } from './earth-engine.service';

describe('EarthEngineService', () => {
  let service: EarthEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EarthEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
