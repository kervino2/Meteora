import { TestBed } from '@angular/core/testing';

import { FullscreenImageService } from './fullscreen-image.service';

describe('FullscreenImageService', () => {
  let service: FullscreenImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FullscreenImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
