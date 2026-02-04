import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VsAlturaComponent } from './vs-altura.component';

describe('VsAlturaComponent', () => {
  let component: VsAlturaComponent;
  let fixture: ComponentFixture<VsAlturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VsAlturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VsAlturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
