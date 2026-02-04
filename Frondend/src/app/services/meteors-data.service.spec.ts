import { TestBed } from '@angular/core/testing';

import { MeteorsDataService } from './meteors-data.service';

describe('MeteorsDataService', () => {
  let service: MeteorsDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeteorsDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
