import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VsPesoComponent } from './vs-peso.component';

describe('VsPesoComponent', () => {
  let component: VsPesoComponent;
  let fixture: ComponentFixture<VsPesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VsPesoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VsPesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
