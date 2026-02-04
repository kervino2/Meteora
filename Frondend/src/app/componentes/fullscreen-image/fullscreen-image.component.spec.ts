import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullscreenImageComponent } from './fullscreen-image.component';

describe('FullscreenImageComponent', () => {
  let component: FullscreenImageComponent;
  let fixture: ComponentFixture<FullscreenImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullscreenImageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullscreenImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
