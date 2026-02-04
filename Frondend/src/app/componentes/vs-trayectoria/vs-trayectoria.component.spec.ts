import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VsTrayectoriaComponent } from './vs-trayectoria.component';

describe('VsTrayectoriaComponent', () => {
  let component: VsTrayectoriaComponent;
  let fixture: ComponentFixture<VsTrayectoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VsTrayectoriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VsTrayectoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
